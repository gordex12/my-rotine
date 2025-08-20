export async function POST(request) {
  const { message, conversationId, tasks } = await request.json();

  if (!message) {
    return new Response(JSON.stringify({ error: 'Mensagem é obrigatória' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Configurar headers para SSE
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Preparar contexto das tarefas para a IA
        let contextMessage = message;
        
        // Sempre enviar system message com contexto completo
        const weekdayTasks = tasks ? tasks.filter(task => !task.isWeekend) : [];
        const weekendTasks = tasks ? tasks.filter(task => task.isWeekend) : [];
        
        const weekdayContext = weekdayTasks.length > 0 
          ? weekdayTasks.map(task => 
              `- ${task.text}${task.time ? ` (${task.time})` : ''}${task.description ? ` - ${task.description}` : ''} - ${task.completed ? 'Concluída' : 'Pendente'}`
            ).join('\n')
          : 'Nenhuma tarefa cadastrada para dias da semana';
          
        const weekendContext = weekendTasks.length > 0
          ? weekendTasks.map(task => 
              `- ${task.text}${task.time ? ` (${task.time})` : ''}${task.description ? ` - ${task.description}` : ''} - ${task.completed ? 'Concluída' : 'Pendente'}`
            ).join('\n')
          : 'Nenhuma tarefa cadastrada para fim de semana';
        
        contextMessage = `INSTRUÇÕES DO SISTEMA:
Você é um assistente especializado em produtividade pessoal e organização de rotinas. Sua função é ajudar o usuário com suas tarefas diárias de forma prática e objetiva.

DIRETRIZES OBRIGATÓRIAS:
1. SEMPRE responda em português brasileiro
2. Seja direto, claro e conciso - evite textos longos
3. Foque apenas em produtividade, organização e gestão de tarefas
4. NUNCA faça pesquisas na internet - use APENAS o contexto fornecido
5. NÃO acesse dados externos - trabalhe apenas com as informações das tarefas do usuário
6. Se não souber algo específico, seja honesto e ofereça alternativas práticas
7. Mantenha tom amigável mas profissional
8. Dê respostas acionáveis - sempre inclua próximos passos ou sugestões práticas
9. IMPORTANTE: Responda APENAS com base nas tarefas cadastradas pelo usuário

CONTEXTO COMPLETO DO USUÁRIO:

 TAREFAS DOS DIAS DA SEMANA (Segunda a Sexta):
${weekdayContext}

 TAREFAS DO FIM DE SEMANA (Sábado e Domingo):
${weekendContext}

 RESUMO ESTATÍSTICO:
- Total de tarefas: ${tasks ? tasks.length : 0}
- Tarefas concluídas: ${tasks ? tasks.filter(t => t.completed).length : 0}
- Tarefas pendentes: ${tasks ? tasks.filter(t => !t.completed).length : 0}
- Tarefas com horário: ${tasks ? tasks.filter(t => t.time).length : 0}

 ESTRUTURA DA ROTINA:
O usuário organiza suas tarefas em dois modelos:
1. Rotina de dias úteis (segunda a sexta-feira)
2. Rotina de fim de semana (sábado e domingo)

PERGUNTA DO USUÁRIO: ${message}

Responda considerando EXCLUSIVAMENTE o contexto das tarefas acima. NÃO faça pesquisas externas.`;

        console.log('Enviando para servidor Python:', contextMessage);

        // Detectar IP do servidor Python automaticamente
        const pythonServerUrl = process.env.PYTHON_API_URL || await detectPythonServer();
        console.log('URL do servidor Python:', pythonServerUrl);

        // Fazer requisição para o servidor Python
        const response = await fetch(`${pythonServerUrl}/v1/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 123'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            input: contextMessage,
            stream: true,
            conversation_id: conversationId || 'default'
          })
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        console.log('Resposta do servidor Python recebida, iniciando stream...');

        // Stream da resposta - repassar diretamente
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream do servidor Python finalizado');
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Chunk do servidor Python:', chunk);
          
          // Repassar chunk diretamente para o frontend
          controller.enqueue(new TextEncoder().encode(chunk));
        }

      } catch (error) {
        console.error('Erro no chat:', error);
        const errorData = JSON.stringify({ 
          error: { 
            message: `Erro de conexão: ${error.message}. Certifique-se de que o servidor Python está rodando. Execute: python perplexity/perplexity_working.py` 
          } 
        });
        controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
      }

      controller.close();
    }
  });

  return new Response(stream, { headers });
}

// Função para detectar automaticamente o servidor Python
async function detectPythonServer() {
  const possibleUrls = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://192.168.15.7:8000'
  ];

  // Testar cada URL possível
  for (const url of possibleUrls) {
    try {
      const testResponse = await fetch(`${url}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      
      if (testResponse.ok) {
        console.log(`Servidor Python encontrado em: ${url}`);
        return url;
      }
    } catch (e) {
      continue;
    }
  }

  console.warn('Servidor Python não encontrado, usando fallback: http://localhost:8000');
  return 'http://localhost:8000';
}
