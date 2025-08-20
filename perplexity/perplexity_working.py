from curl_cffi import requests
import json
from uuid import uuid4

class WorkingPerplexityClient:
    """
    Cliente Perplexity funcional que resolve o problema de retorno None.
    """
    
    def __init__(self, cookies={}):
        self.session = requests.Session(impersonate="chrome110")
        # Variáveis para manter contexto da conversa
        self.last_backend_uuid = None
        self.read_write_token = None
        self.frontend_uuid = str(uuid4())
        self.visitor_id = str(uuid4())
        self.user_nextauth_id = None
        self.context_uuid = None
        self.frontend_context_uuid = None
        # Update headers
        self.session.headers.update({
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'max-age=0',
            'dnt': '1',
            'priority': 'u=0, i',
            'sec-ch-ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
            'sec-ch-ua-arch': '"x86"',
            'sec-ch-ua-bitness': '"64"',
            'sec-ch-ua-full-version': '"128.0.6613.120"',
            'sec-ch-ua-full-version-list': '"Not;A=Brand";v="24.0.0.0", "Chromium";v="128.0.6613.120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"19.0.0"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        })
        
        # Update cookies separately if provided
        if cookies:
            self.session.cookies.update(cookies)
        
        # Autenticar sessão
        self.session.get('https://www.perplexity.ai/api/auth/session')
        self.last_backend_uuid = None
        
    def search(self, query, mode='pro',model='gpt-4o', sources=['web'], language='pt-BR', is_followup=False):
        """
        Realiza uma busca no Perplexity AI.
        
        Args:
            query (str): A pergunta/consulta
            mode (str): Modo de busca ('auto', 'pro', 'reasoning', 'deep research')
            language (str): Código de idioma (ex: 'en-US', 'pt-BR')
            is_followup (bool): Se é uma pergunta de follow-up
            
        Returns:
            dict: Resposta processada ou None se houver erro
        """
        try:
            
            # Preparar dados da requisição com contexto
            json_data = {
                'query_str': query,
                'params': {
                    'last_backend_uuid': self.last_backend_uuid,
                    'context_uuid': getattr(self, 'context_uuid', None),
                    'frontend_context_uuid': getattr(self, 'frontend_context_uuid', None),
                    'read_write_token': self.read_write_token,
                    'attachments': [],
                    'language': language,
                    'timezone': 'America/Sao_Paulo',
                    'search_focus': 'internet',
                    'frontend_uuid': self.frontend_uuid,
                    'is_related_query': False,
                    'is_sponsored': False,
                    'visitor_id': self.visitor_id,
                    'user_nextauth_id': self.user_nextauth_id,
                    'prompt_source': 'user',
                    'query_source': 'followup' if (getattr(self, 'context_uuid', None) or getattr(self, 'read_write_token', None) or getattr(self, 'last_backend_uuid', None)) else 'home',
                    'is_incognito': False,
                    'use_schematized_api': True,
                    'send_back_text_in_streaming_api': False,
                    'supported_block_use_cases': [
                        'answer_modes', 'media_items', 'knowledge_cards',
                        'inline_entity_cards', 'place_widgets', 'finance_widgets',
                        'sports_widgets', 'shopping_widgets', 'jobs_widgets',
                        'search_result_widgets', 'clarification_responses',
                        'inline_images', 'inline_assets', 'inline_finance_widgets',
                        'placeholder_cards', 'diff_blocks', 'inline_knowledge_cards', 'entity_group_v2'
                    ],
                    'client_coordinates': None,
                    'mentions': [],
                    'skip_search_enabled': True,
                    'is_nav_suggestions_disabled': False,
                    'followup_source': 'link' if is_followup else None,
                    'mode': 'concise',
                    'model_preference': 'turbo',
                    'source': 'default',
                    'sources': sources,
                    'version': '2.18',
                    'context_uuid': getattr(self, 'context_uuid', None),
                    'search_recency_filter': None,
                    'dsl_query': query,
                    'local_search_enabled': False,
                    'always_search_override': False,
                    'override_no_search': False,
                    'comet_max_assistant_enabled': False,
                }
            }
            
            # Fazer requisição
            _sse_headers = {
                **self.session.headers,
                'accept': 'text/event-stream',
                'origin': 'https://www.perplexity.ai',
                'referer': 'https://www.perplexity.ai/',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            }
            response = self.session.post(
                'https://www.perplexity.ai/rest/sse/perplexity_ask', 
                json=json_data,
                headers=_sse_headers,
                stream=True,
            )
            
            if response.status_code != 200:
                try:
                    body = response.text[:1000]
                except Exception:
                    body = ''
                print(f"❌ Erro HTTP: {response.status_code} | body: {body}")
                return None
            
            # valida Content-Type do upstream (evita parse de HTML do Cloudflare)
            ct = (response.headers.get('content-type') or '').lower()
            if 'text/event-stream' not in ct:
                try:
                    body = response.text[:1000]
                except Exception:
                    body = ''
                print(f"❌ Upstream content-type inesperado: {ct or 'desconhecido'} | body: {body}")
                return None
            
            # Processar resposta Server-Sent Events
            content_text = response.content.decode('utf-8')
            
            if not content_text.strip():
                return None
            
            # Extrair chunks válidos
            chunks = []
            events = content_text.split('\r\n\r\n')
            
            def _update_ctx_from_event_lines(lines: list[str]):
                try:
                    data_parts = [l[5:].lstrip() for l in lines if l.startswith('data:')]
                    if not data_parts:
                        return
                    joined = ''.join(data_parts).strip()
                    objs = []
                    try:
                        obj = json.loads(joined)
                        objs = [obj]
                    except Exception:
                        for part in data_parts:
                            part = part.strip()
                            if not part or part[:1] not in ('{', '['):
                                continue
                            try:
                                objs.append(json.loads(part))
                            except Exception:
                                continue
                    for obj in objs:
                        if not isinstance(obj, dict):
                            continue
                        bu = obj.get('backend_uuid')
                        cu = obj.get('context_uuid')
                        fcu = obj.get('frontend_context_uuid')
                        rwt = obj.get('read_write_token')
                        if bu:
                            setattr(self, 'last_backend_uuid', bu)
                        # Preserve o primeiro context_uuid/front_ctx/read_write_token da conversa
                        if cu and getattr(self, 'context_uuid', None) is None:
                            setattr(self, 'context_uuid', cu)
                        if fcu and getattr(self, 'frontend_context_uuid', None) is None:
                            setattr(self, 'frontend_context_uuid', fcu)
                        if rwt and getattr(self, 'read_write_token', None) is None:
                            setattr(self, 'read_write_token', rwt)
                except Exception:
                    pass

            for event in events:
                if not event.strip():
                    continue
                    
                if event.startswith('event: message\r\n'):
                    try:
                        # Extrair dados JSON
                        json_part = event[len('event: message\r\ndata: '):]
                        event_data = json.loads(json_part)
                        
                        # Parse do campo 'text' se existir
                        if 'text' in event_data and isinstance(event_data['text'], str):
                            try:
                                event_data['text'] = json.loads(event_data['text'])
                            except json.JSONDecodeError:
                                # Se não conseguir fazer parse, manter como string
                                pass
                        
                        chunks.append(event_data)
                        
                    except json.JSONDecodeError as e:
                        print(f"⚠️ Erro ao processar chunk: {e}")
                        continue
                
                elif event.startswith('event: end_of_stream\r\n'):
                    break
            
            if not chunks:
                print("❌ Nenhum chunk válido encontrado")
                return None
            
            # Update last_backend_uuid for conversation continuity
            final_chunk = chunks[-1]
            if 'backend_uuid' in final_chunk:
                self.last_backend_uuid = final_chunk['backend_uuid']
            # Preserve primeiros valores
            if 'read_write_token' in final_chunk and getattr(self, 'read_write_token', None) is None:
                self.read_write_token = final_chunk['read_write_token']
            if 'context_uuid' in final_chunk and getattr(self, 'context_uuid', None) is None:
                self.context_uuid = final_chunk['context_uuid']
            if 'frontend_context_uuid' in final_chunk and getattr(self, 'frontend_context_uuid', None) is None:
                self.frontend_context_uuid = final_chunk['frontend_context_uuid']
            
            return final_chunk
            
        except Exception as e:
            print(f"❌ Erro na busca: {e}")
            return None
    
    def get_answer_text(self, response):
        """
        Extrai o texto da resposta de forma limpa.
        
        Args:
            response (dict): Resposta do método search()
            
        Returns:
            str: Texto da resposta ou None se não encontrado
        """
        if not response or 'text' not in response:
            return None
            
        try:
            text_data = response['text']
            
            if isinstance(text_data, list):
                # Procurar pelo step FINAL
                for item in text_data:
                    if (isinstance(item, dict) and 
                        item.get('step_type') == 'FINAL' and 
                        'content' in item and 
                        'answer' in item['content']):
                        
                        answer_json = json.loads(item['content']['answer'])
                        return answer_json.get('answer', '')
            
            elif isinstance(text_data, str):
                return text_data
                
        except Exception as e:
            print(f"⚠️ Erro ao extrair resposta: {e}")
            
        return None

# ==========================
# API OpenAI-compat (FastAPI)
# ==========================
def start_openai_compat_api(host: str = "127.0.0.1", port: int = 8000, *, threaded: bool = True):
    try:
        from fastapi import FastAPI, Request
        from fastapi.responses import StreamingResponse, JSONResponse
        import uvicorn
        import threading
        import time
        import traceback as _tb
        import requests as _rq

        app = FastAPI()

        # Conversas em memória: conversation_id -> WorkingPerplexityClient()
        CONVERSATIONS: dict[str, WorkingPerplexityClient] = {}

        @app.get("/health")
        async def health():
            return {"status": "ok"}

        def _get_or_create_client(conversation_id: str | None) -> WorkingPerplexityClient:
            key = conversation_id or "default"
            if key not in CONVERSATIONS:
                CONVERSATIONS[key] = WorkingPerplexityClient()
            return CONVERSATIONS[key]

        @app.post("/v1/responses")
        async def responses(request: Request):
            try:
                body = await request.json()
            except Exception:
                return JSONResponse({"error": {"message": "Body inválido: esperado JSON"}}, status_code=400)
            
            model = body.get("model", "gpt-4o")
            stream = bool(body.get("stream", False))
            conversation_id = body.get("conversation_id") or body.get("thread_id") or body.get("id_base")
            direct_input = body.get("input") or body.get("prompt") or ""

            client = _get_or_create_client(conversation_id)

            query = direct_input if isinstance(direct_input, str) else ""

            if stream:
                # Streaming SSE de respostas no formato simples para o cliente consumir
                def gen_resp():
                    import json as _json
                    try:
                        # Monta o payload igual ao usado em search() para máxima compatibilidade
                        json_data = {
                            'query_str': query,
                            'params': {
                                'last_backend_uuid': client.last_backend_uuid,
                                'context_uuid': getattr(client, 'context_uuid', None),
                                'frontend_context_uuid': getattr(client, 'frontend_context_uuid', None),
                                'read_write_token': client.read_write_token,
                                'attachments': [],
                                'language': 'pt-BR',
                                'timezone': 'America/Sao_Paulo',
                                'search_focus': 'internet',
                                'frontend_uuid': client.frontend_uuid,
                                'is_related_query': False,
                                'is_sponsored': False,
                                'visitor_id': client.visitor_id,
                                'user_nextauth_id': client.user_nextauth_id,
                                'prompt_source': 'user',
                                'query_source': 'followup' if (getattr(client, 'context_uuid', None) or getattr(client, 'read_write_token', None) or getattr(client, 'last_backend_uuid', None)) else 'home',
                                'is_incognito': False,
                                'time_from_first_type': None,
                                'local_search_enabled': False,
                                'use_schematized_api': True,
                                'send_back_text_in_streaming_api': False,
                                'supported_block_use_cases': [
                                    'answer_modes','media_items','knowledge_cards','inline_entity_cards','place_widgets','finance_widgets','sports_widgets','shopping_widgets','jobs_widgets','search_result_widgets','clarification_responses','inline_images','inline_assets','inline_finance_widgets','placeholder_cards','diff_blocks','inline_knowledge_cards','entity_group_v2'
                                ],
                                'client_coordinates': None,
                                'mentions': [],
                                'dsl_query': query,
                                'skip_search_enabled': True,
                                'is_nav_suggestions_disabled': False,
                                'always_search_override': False,
                                'override_no_search': False,
                                'comet_max_assistant_enabled': False,
                                'followup_source': None,
                                'mode': 'concise',
                                'model_preference': 'turbo',
                                'source': 'default',
                                'sources': ['web'],
                                'version': '2.18',
                                'context_uuid': getattr(client, 'context_uuid', None),
                                'search_recency_filter': None,
                            }
                        }

                        # usar curl_cffi (client.session) para manter fingerprint/headers e evitar 403 (Cloudflare)
                        _sse_headers = {
                            **client.session.headers,
                            'accept': 'text/event-stream',
                            'origin': 'https://www.perplexity.ai',
                            'referer': 'https://www.perplexity.ai/',
                            'sec-fetch-mode': 'cors',
                            'sec-fetch-site': 'same-origin',
                            'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                        }
                        resp = client.session.post(
                            'https://www.perplexity.ai/rest/sse/perplexity_ask',
                            json=json_data,
                            headers=_sse_headers,
                            stream=True,
                        )
                        if resp.status_code != 200:
                            try:
                                body = resp.text[:1000]
                            except Exception:
                                body = ''
                            err = {"error": {"message": f"Upstream HTTP {resp.status_code} | body: {body}"}}
                            yield f"data: {_json.dumps(err, ensure_ascii=False)}\n\n"
                            return

                        # valida Content-Type do upstream (evita parse de HTML do Cloudflare)
                        ct = (resp.headers.get('content-type') or '').lower()
                        if 'text/event-stream' not in ct:
                            try:
                                body = resp.text[:1000]
                            except Exception:
                                body = ''
                            err = {"error": {"message": f"Upstream content-type inesperado: {ct or 'desconhecido'} | body: {body}"}}
                            yield f"data: {_json.dumps(err, ensure_ascii=False)}\n\n"
                            return

                        # helper: extrai e atualiza contexto do cliente a partir das linhas do evento SSE
                        def _update_ctx_from_event_lines(lines: list[str]):
                            try:
                                data_parts = [l[5:].lstrip() for l in lines if l.startswith('data:')]
                                if not data_parts:
                                    return
                                joined = ''.join(data_parts).strip()
                                objs: list = []
                                try:
                                    obj = _json.loads(joined)
                                    objs = [obj]
                                except Exception:
                                    for part in data_parts:
                                        p = part.strip()
                                        if not p or p[:1] not in ('{', '['):
                                            continue
                                        try:
                                            objs.append(_json.loads(p))
                                        except Exception:
                                            continue
                                for obj in objs:
                                    if not isinstance(obj, dict):
                                        continue
                                    bu = obj.get('backend_uuid')
                                    cu = obj.get('context_uuid')
                                    fcu = obj.get('frontend_context_uuid')
                                    rwt = obj.get('read_write_token')
                                    if bu:
                                        setattr(client, 'last_backend_uuid', bu)
                                    # Preserve o primeiro context_uuid/front_ctx/read_write_token da conversa
                                    if cu and getattr(client, 'context_uuid', None) is None:
                                        setattr(client, 'context_uuid', cu)
                                    if fcu and getattr(client, 'frontend_context_uuid', None) is None:
                                        setattr(client, 'frontend_context_uuid', fcu)
                                    if rwt and getattr(client, 'read_write_token', None) is None:
                                        setattr(client, 'read_write_token', rwt)
                            except Exception:
                                pass

                        def _extract_useful_text(piece, st):
                            # retorna iterável de strings limpias p/ enviar
                            emitted = st['emitted_chunks']
                            acc = st['acc_answer']
                            try:
                                # strings que parecem JSON -> tentar carregar
                                if isinstance(piece, str) and piece and piece.lstrip().startswith(("[", "{")):
                                    piece_loaded = _json.loads(piece)
                                else:
                                    piece_loaded = piece
                            except Exception:
                                piece_loaded = piece

                            out = []
                            try:
                                # caso steps: lista de objetos
                                if isinstance(piece_loaded, list):
                                    for step in piece_loaded:
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
                                                    ans_obj = _json.loads(ans_str)
                                                except Exception:
                                                    ans_obj = None
                                                if isinstance(ans_obj, dict):
                                                    chunks = ans_obj.get('chunks')
                                                    if isinstance(chunks, list):
                                                        for ch in chunks:
                                                            if isinstance(ch, str) and ch and ch not in emitted:
                                                                emitted.add(ch)
                                                                out.append(ch)
                                                    # fallback: se houver 'answer' final, emitir apenas sufixo novo
                                                    final_txt = ans_obj.get('answer')
                                                    if isinstance(final_txt, str) and final_txt:
                                                        # emite apenas o sufixo não enviado
                                                        if final_txt.startswith(acc):
                                                            new_part = final_txt[len(acc):]
                                                        else:
                                                            new_part = final_txt
                                                        if new_part:
                                                            out.append(new_part)
                                                        st['acc_answer'] = final_txt
                                    return out
                            except Exception:
                                pass
                            # não era steps estruturado -> tratar como texto simples
                            if isinstance(piece, str) and piece.strip():
                                return [piece]
                            return []

                        def send_delta(text_piece: str):
                            data = {"type": "content.delta", "delta": text_piece}
                            yield f"data: {_json.dumps(data, ensure_ascii=False)}\n\n"

                        def process_event(ev_text: str):
                            if not ev_text.strip():
                                return None, None
                            if ev_text.startswith(":"):
                                return None, None
                            if ev_text.strip() == "data: [DONE]":
                                return None, 'END'
                            try:
                                if ev_text.startswith("data: "):
                                    payload = ev_text[6:]
                                else:
                                    payload = ev_text
                                obj = _json.loads(payload)
                            except Exception:
                                return payload, None
                            if isinstance(obj, dict) and obj.get("type") == "response.completed":
                                return None, 'END'
                            return obj, None

                        current_event_lines: list[str] = []

                        buf = b''
                        for chunk in resp.iter_content(chunk_size=4096):
                            if not chunk:
                                continue
                            buf += chunk
                            while b'\n' in buf:
                                raw_line, buf = buf.split(b'\n', 1)
                                line = raw_line.decode('utf-8', 'ignore')
                                if not line:
                                    continue
                                if line.strip() == '':
                                    ev = '\r\n'.join(current_event_lines)
                                    _update_ctx_from_event_lines(current_event_lines)
                                    current_event_lines = []
                                    # passthrough: reenvia exatamente como veio do upstream
                                    yield f"{ev}\n\n"
                                    # interromper apenas em '[DONE]'
                                    if ev.strip() == 'data: [DONE]':
                                        break
                                else:
                                    current_event_lines.append(line)
                            else:
                                pass
                        if buf:
                            try:
                                tail = buf.decode('utf-8', 'ignore')
                                if tail:
                                    current_event_lines.append(tail)
                            except Exception:
                                pass
                        if current_event_lines:
                            ev = '\r\n'.join(current_event_lines)
                            _update_ctx_from_event_lines(current_event_lines)
                            current_event_lines = []
                            # passthrough: reenvia exatamente como veio do upstream
                            yield f"{ev}\n\n"
                            # fora do loop de linhas, encerrar somente em '[DONE]'
                            if ev.strip() == 'data: [DONE]':
                                return

                    except Exception as stre:
                        err = {"error": {"message": f"Stream error: {stre.__class__.__name__}: {str(stre) or 'no message'}"}}
                        yield f"data: {_json.dumps(err, ensure_ascii=False)}\n\n"
                        return

                return StreamingResponse(
                    gen_resp(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no",
                    },
                )

            # Caminho não-stream
            resp = client.search(query, model=model, language='pt-BR', is_followup=False)
            content = client.get_answer_text(resp) or ""

            data = {
                "id": f"resp-{uuid4()}",
                "object": "response",
                "created": int(time.time()),
                "model": model,
                "output": [
                    {
                        "type": "message",
                        "role": "assistant",
                        "content": [
                            {"type": "output_text", "text": content}
                        ]
                    }
                ],
            }
            return JSONResponse(data)

        def _run():
            uvicorn.run(app, host=host, port=port, log_level="warning")

        if threaded:
            th = threading.Thread(target=_run, daemon=True)
            th.start()
            return True, f"http://{host}:{port}/v1"
        else:
            # Bloqueia a thread atual até o servidor encerrar
            _run()
            return True, f"http://{host}:{port}/v1"
    except Exception as e:
        print(f"⚠️ Falha ao iniciar API OpenAI-compat: {e}\nInstale dependências: pip install fastapi uvicorn")
        return False, ""

if __name__ == "__main__":
    import socket
    
    # Obter IP da máquina
    def get_local_ip():
        try:
            # Conecta a um endereço externo para descobrir o IP local
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "0.0.0.0"  # Fallback para aceitar todas as interfaces
    
    host_ip = get_local_ip()
    print(f"Iniciando servidor OpenAI-compat em modo bloqueante: http://{host_ip}:8000/v1")
    print(f"Servidor também acessível via: http://0.0.0.0:8000/v1")
    ok, _ = start_openai_compat_api(host="0.0.0.0", threaded=False)
    if not ok:
        raise SystemExit(1)
