# chat_client.py
from openai import OpenAI
from uuid import uuid4
import requests
import json
import re
import sys

BASE_URL = "http://127.0.0.1:8000/v1"
API_KEY = "123"
MODEL = "gpt-4o"

_STREAM_ACC = ""
_PENDING_WS = ""

# DEBUG: altere para False para silenciar logs
DEBUG = False

def _dbg(msg: str):
    if DEBUG:
        print(f"[debug] {msg}", file=sys.stderr, flush=True)

def extract_text(resp):
    # Tenta 'output_text' (SDK costuma expor)
    try:
        txt = getattr(resp, "output_text", None)
        if txt:
            return txt
    except Exception:
        pass
    # Fallback no payload bruto
    try:
        output = getattr(resp, "output", None) or resp.get("output")  # type: ignore
        if isinstance(output, list) and output:
            first = output[0]
            if isinstance(first, dict):
                content = first.get("content")
                if isinstance(content, list) and content:
                    for c in content:
                        if isinstance(c, dict) and c.get("type") in {"output_text", "text"}:
                            if c.get("text"):
                                return c["text"]
    except Exception:
        pass
    return "(sem conteúdo)"

def _print_chunks_from_answer_payload(obj: dict) -> bool:
    """Imprime SOMENTE chunks da resposta (sem fallback para 'answer' completo)."""
    try:
        if not isinstance(obj, dict):
            return False
        chunks = obj.get("chunks")
        if not isinstance(chunks, list):
            return False
        safe = [c for c in chunks if isinstance(c, str) and c and c.strip()]
        if not safe:
            return False
        return _print_only_new_suffix("".join(safe))
    except Exception:
        return False

def _iter_possible_json_docs(s: str):
    """Tenta fatiar strings com múltiplos JSON concatenados (ex.: "] [" ou "}{")."""
    # primeiro, quebras comuns
    separators = ['][' , '}{', ']\n[', '}\n{']
    # se nenhuma ocorrência, devolve inteiro
    if not any(sep in s for sep in separators):
        yield s
        return
    # substitui variações por um separador comum
    tmp = s.replace(']\n[', '][').replace('}\n{', '}{')
    parts = []
    for chunk in tmp.split(']['):
        # restaurar colchetes em cada parte
        if not chunk.startswith('['):
            chunk = '[' + chunk
        if not chunk.endswith(']'):
            chunk = chunk + ']'
        parts.append(chunk)
    # '}{' também possível (objetos)
    out = []
    for p in parts:
        if '}{' in p:
            subs = p.split('}{')
            for i, sub in enumerate(subs):
                if not sub.startswith('{'):
                    sub = '{' + sub
                if not sub.endswith('}'):
                    sub = sub + '}'
                out.append(sub)
        else:
            out.append(p)
    for doc in out:
        yield doc

def _try_extract_answer_from_raw(delta_str: str) -> bool:
    """Best-effort: extrair answer/chunks de uma string que contém JSON escapado."""
    # procura por chave "answer": "{...}" (JSON escapado)
    m = re.search(r'"answer"\s*:\s*"(\{.*?\})"', delta_str)
    if not m:
        return False
    raw = m.group(1)
    try:
        # desescapa aspas
        unescaped = raw.encode('utf-8').decode('unicode_escape')
        obj = json.loads(unescaped)
    except Exception:
        return False
    return _print_chunks_from_answer_payload(obj)

def _try_print_perplexity_steps(delta_str: str) -> bool:
    """Imprime SOMENTE chunks do campo answer dentro de steps FINAL (sem fallback)."""
    try:
        payload = json.loads(delta_str)
    except Exception:
        return False

    printed = False
    # formatos esperados: lista de steps ou dict com 'text' que é string JSON desses steps
    if isinstance(payload, dict) and isinstance(payload.get('text'), str):
        try:
            payload = json.loads(payload['text'])
        except Exception:
            return False
    if isinstance(payload, list):
        for step in payload:
            if not isinstance(step, dict):
                continue
            stype = step.get('step_type')
            if stype == 'INITIAL_QUERY':
                continue
            if stype == 'FINAL':
                content = step.get('content') or {}
                ans_str = content.get('answer')
                if isinstance(ans_str, str):
                    try:
                        ans_obj = json.loads(ans_str)
                    except Exception:
                        ans_obj = None
                    if isinstance(ans_obj, dict):
                        # Somente chunks
                        chunks = ans_obj.get('chunks')
                        if isinstance(chunks, list):
                            safe_chunks = [ch for ch in chunks if isinstance(ch, str) and ch and ch.strip()]
                            if safe_chunks and _print_only_new_suffix(''.join(safe_chunks)):
                                printed = True
    return printed

def _extract_inner_jsons_from_data_carrier(s: str) -> list[str]:
    """Extrai todos os objetos JSON que seguem após ocorrências de 'data: ' em uma string.
    Usa balanceamento de chaves para encontrar o término de cada JSON.
    Retorna lista de strings JSON completas.
    """
    out: list[str] = []
    i = 0
    n = len(s)
    while i < n:
        idx = s.find('data: ', i)
        if idx == -1:
            break
        j = idx + len('data: ')
        # pular espaços
        while j < n and s[j] in (' ', '\t'):
            j += 1
        if j >= n or s[j] != '{':
            i = j
            continue
        # balancear chaves
        depth = 0
        k = j
        in_str = False
        esc = False
        while k < n:
            ch = s[k]
            if in_str:
                if esc:
                    esc = False
                elif ch == '\\':
                    esc = True
                elif ch == '"':
                    in_str = False
            else:
                if ch == '"':
                    in_str = True
                elif ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        # inclui o '}' atual
                        out.append(s[j:k+1])
                        k += 1
                        break
            k += 1
        i = k
    return out

def _try_handle_event_message_carrier(s: str) -> bool:
    """Tratamento especial quando o delta contém um envelope 'event: message' com linhas 'data: {...}'.
    Extrai os payloads data:, faz json.loads, e tenta imprimir SOMENTE a partir de answer/chunks.
    """
    if 'data:' not in s:
        return False
    try:
        handled_any = False
        for payload in _extract_inner_jsons_from_data_carrier(s):
            try:
                obj = json.loads(payload)
            except Exception:
                continue
            text_field = obj.get('text') if isinstance(obj, dict) else None
            if isinstance(text_field, str) and text_field:
                # Imprimir apenas se houver chunks em answer
                if _try_print_perplexity_steps(text_field):
                    handled_any = True
                    continue
                for doc in _iter_possible_json_docs(text_field):
                    if _try_print_perplexity_steps(doc):
                        handled_any = True
                        break
                # sem fallback para answer completo/strings avulsas
        return handled_any
    except Exception:
        return False

def _iter_data_payload_json_objs(s: str):
    """Itera objetos JSON imediatamente após marcadores 'data: ' na string s.
    Usa balanceamento de chaves para capturar objetos mesmo sem quebra de linha entre eventos.
    """
    i = 0
    n = len(s)
    while True:
        idx = s.find('data: ', i)
        if idx == -1:
            return
        j = idx + len('data: ')
        # pular espaços
        while j < n and s[j].isspace():
            j += 1
        if j >= n or s[j] != '{':
            i = j
            continue
        # ler objeto { ... } com balanceamento
        brace = 0
        k = j
        in_str = False
        esc = False
        while k < n:
            ch = s[k]
            if in_str:
                if esc:
                    esc = False
                elif ch == '\\':
                    esc = True
                elif ch == '"':
                    in_str = False
            else:
                if ch == '"':
                    in_str = True
                elif ch == '{':
                    brace += 1
                elif ch == '}':
                    brace -= 1
                    if brace == 0:
                        k += 1
                        break
            k += 1
        try:
            obj = json.loads(s[j:k])
            yield obj
        except Exception:
            pass
        i = k

def _reset_stream_acc():
    global _STREAM_ACC
    global _PENDING_WS
    _STREAM_ACC = ""
    _PENDING_WS = ""

def _print_only_new_suffix(full_text: str) -> bool:
    """Imprime apenas o sufixo não impresso ainda com base em _STREAM_ACC.
    Retorna True se imprimiu algo.
    """
    global _STREAM_ACC, _PENDING_WS
    prev = _STREAM_ACC or ""
    # encontra prefixo comum
    i = 0
    try:
        while i < len(prev) and i < len(full_text) and prev[i] == full_text[i]:
            i += 1
    except Exception:
        i = 0
    suffix = full_text[i:]
    _dbg(f"_print_only_new_suffix: prev_len={len(prev)} new_len={len(full_text)} common_prefix={i} suffix={suffix!r}")
    # Não imprimir sufixos que sejam apenas whitespace (inclui quebras de linha)
    if not suffix or not suffix.strip():
        _dbg("_print_only_new_suffix: sufixo vazio/whitespace -> ignorado")
        _PENDING_WS += suffix
        _STREAM_ACC = full_text
        return False
    # Remover qualquer whitespace inicial (inclui quebras de linha e espaços) para evitar buracos
    suffix2 = suffix.lstrip()
    if not suffix2:
        _STREAM_ACC = full_text
        return False
    # Normalização agressiva para evitar quebras de linha: substituir \r/\n por espaço e colapsar múltiplos espaços
    try:
        import re as _re
        # troca quebras por espaço
        norm = _re.sub(r"[\r\n]+", " ", suffix2)
        # colapsa múltiplos espaços
        norm = _re.sub(r"\s{2,}", " ", norm)
        # remove espaço antes de pontuação comum
        norm = _re.sub(r"\s+([,.;:!?%\)\]\}\»])", r"\1", norm)
        # opcional: remove espaço no início absoluto
        norm = norm.lstrip()
    except Exception:
        norm = suffix2
    if not norm:
        _STREAM_ACC = full_text
        return False
    print(norm, end="", flush=True)
    _STREAM_ACC = full_text
    return True

def main():
    client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

    print("\nIniciando interação com o usuário...\n")
    try:
        initial = input("Informe um conversation_id existente ou ENTER para criar um novo: ").strip()
    except Exception:
        initial = ""
    conversation_id = initial if initial else str(uuid4())

    while True:
        q = input("\nDigite sua pergunta (ou 'sair' para encerrar): ")
        if q.strip().lower() in {"sair", "exit", "quit"}:
            print("\nAté logo! 👋")
            break

        # Comandos de controle de conversa
        if q.startswith(":id ") or q.startswith("/id "):
            new_id = q.split(" ", 1)[1].strip()
            if new_id:
                conversation_id = new_id
                print(f"[ok] Trocado conversation_id para: {conversation_id}")
            else:
                print("[erro] Use: :id <valor>")
            continue
        if q.strip().lower() in {":new", "/new"}:
            conversation_id = str(uuid4())
            print(f"[ok] Novo conversation_id: {conversation_id}")
            continue

        print("\n📝 Resposta (streaming):")
        # reinicia acumulador de sufixo a cada nova pergunta/stream
        _reset_stream_acc()
        current = []
        try:
            url = f"{BASE_URL}/responses"
            headers = {
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            }
            data = {"model": MODEL, "input": q, "stream": True, "conversation_id": conversation_id}
            print(f"[info] usando conversation_id={conversation_id}")
            with requests.post(url, headers=headers, json=data, stream=True) as r:
                if r.status_code != 200:
                    print(f"Erro: status {r.status_code}")
                    try:
                        print(r.text[:1000])
                    except Exception:
                        pass
                    continue
                for raw in r.iter_lines(decode_unicode=True):
                    try:
                        line = raw.decode('utf-8') if isinstance(raw, bytes) else raw
                    except Exception:
                        line = raw if isinstance(raw, str) else ''
                    _dbg(f"recv line: {line!r}")
                    if line is None:
                        continue
                    line = line.rstrip('\r')
                    if line == '':
                        # evento completo
                        printed_any = False
                        data_lines = []
                        for l in current:
                            if l.startswith('data:'):
                                data_lines.append(l[len('data:'):].lstrip())
                        data_str = '\n'.join(data_lines).strip()
                        _dbg(f"event assembled with {len(current)} lines; data_str[0:200]={data_str[:200]!r}")
                        current = []
                        if not data_str:
                            _dbg("empty data_str; skipping")
                            continue
                        # tenta parsear como JSON OpenAI/Perplexity, com vários fallbacks para casos reais
                        try:
                            j = json.loads(data_str)
                            handled = False
                            # 1) tentar interpretar como steps do Perplexity
                            if _try_print_perplexity_steps(data_str):
                                _dbg("handled by _try_print_perplexity_steps (JSON parsed)")
                                handled = True
                            # 2) tentar extrair answer/chunks de JSON escapado
                            if not handled and _try_extract_answer_from_raw(data_str):
                                _dbg("handled by _try_extract_answer_from_raw (JSON parsed)")
                                handled = True
                            # 3) erro estruturado
                            if not handled and isinstance(j, dict) and "error" in j:
                                msg = j.get("error", {}).get("message") or "erro desconhecido"
                                print(f"\n[erro] {msg}")
                                _dbg("handled by error branch (JSON parsed)")
                                handled = True
                            if handled:
                                printed_any = True
                                _dbg("printed_any=True (JSON path)")
                                continue
                            else:
                                _dbg("JSON parsed but no handler printed anything")
                        except Exception:
                            _dbg("json.loads failed; trying alternative handlers")
                            # payload possivelmente com JSON concatenado ou escapado; evitar despejar bruto
                            handled = False
                            # 0) tentar extrair inner JSON de 'event: message' e imprimir
                            if _try_handle_event_message_carrier(data_str):
                                _dbg("handled by _try_handle_event_message_carrier")
                                handled = True
                            for doc in _iter_possible_json_docs(data_str):
                                if _try_print_perplexity_steps(doc):
                                    _dbg("handled by _iter_possible_json_docs -> _try_print_perplexity_steps")
                                    handled = True
                            # não usar fallback de texto bruto nem answer completo
                            # tenta interpretar JSON de steps do Perplexity
                            if (not handled and data_str and data_str.lstrip().startswith(('{', '['))):
                                if _try_print_perplexity_steps(data_str):
                                    _dbg("handled by _try_print_perplexity_steps (direct fallback)")
                                    handled = True
                            # se nada foi tratado, não imprime nada
                        # se nada foi impresso, garante linha após término forçado
                        if not printed_any:
                            _dbg("no content printed for event; skipping newline")
                    else:
                        # linha não-vazia: acumula até o próximo separador em branco
                        if line.startswith('event:'):
                            _dbg(f"event header: {line}")
                        current.append(line)
                # não emitir quebra de linha forçada ao final
        except StopIteration:
            # não emitir quebra de linha forçada ao final
            pass
        except KeyboardInterrupt:
            print()  # garante quebra de linha se interromper no meio do stream
            return
        except Exception as e:
            print(f"Erro no streaming SSE: {e}")

if __name__ == "__main__":
    main()