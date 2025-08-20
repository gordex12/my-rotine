'use client';

import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, SparklesIcon, UserIcon } from '@heroicons/react/24/outline';

export default function ChatPage({ tasks }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Olá! Sou seu assistente de rotina pessoal. Posso te ajudar com dicas de produtividade, análise das suas tarefas ou responder perguntas sobre organização pessoal. Como posso te ajudar hoje?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return id;
  });
  const [renderKey, setRenderKey] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentDay = () => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[new Date().getDay()];
  };

  const getTasksForAI = () => {
    const allTasks = [...(tasks.weekdays || []), ...(tasks.weekends || [])];
    
    return allTasks.map(task => ({
      text: task.title,
      time: task.time,
      completed: task.completed,
      description: task.description,
      isWeekend: tasks.weekends?.includes(task) || false
    }));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Adicionar mensagem de loading da IA
    const loadingMessage = {
      id: Date.now() + 1,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversationId,
          tasks: getTasksForAI()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      // Atualizar mensagem inicial para mostrar que está carregando
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: 'Pensando...', isLoading: true }
          : msg
      ));

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                throw new Error(parsed.error.message);
              }

              // Processar chunks do Perplexity em tempo real
              if (parsed.blocks && Array.isArray(parsed.blocks)) {
                for (const block of parsed.blocks) {
                  // Processar chunks incrementais do markdown_block
                  if (block.markdown_block && block.markdown_block.chunks && Array.isArray(block.markdown_block.chunks)) {
                    // Resetar aiResponse para evitar acúmulo
                    aiResponse = '';
                    
                    for (const chunk of block.markdown_block.chunks) {
                      if (chunk && typeof chunk === 'string') {
                        aiResponse += chunk;
                        
                        // Atualizar UI imediatamente a cada chunk
                        setMessages(prev => {
                          const updatedMessages = [...prev];
                          const messageIndex = updatedMessages.findIndex(msg => msg.id === loadingMessage.id);
                          if (messageIndex !== -1) {
                            updatedMessages[messageIndex] = {
                              ...updatedMessages[messageIndex],
                              content: aiResponse,
                              isLoading: false,
                              timestamp: new Date()
                            };
                          }
                          return updatedMessages;
                        });
                        
                        // Pequeno delay para simular digitação
                        await new Promise(resolve => setTimeout(resolve, 100));
                      }
                    }
                    
                    // Não processar outros formatos se já processou chunks
                    return;
                  }
                  // Processar resposta final completa se não houver chunks
                  else if (block.markdown_block && block.markdown_block.answer) {
                    const fullAnswer = block.markdown_block.answer;
                    if (fullAnswer && fullAnswer !== aiResponse) {
                      aiResponse = fullAnswer;
                      
                      setMessages(prev => prev.map(msg => 
                        msg.id === loadingMessage.id 
                          ? { ...msg, content: aiResponse, isLoading: false }
                          : msg
                      ));
                    }
                    return;
                  }
                }
              }

              // Processar resposta do campo 'text' com parsing de steps
              if (parsed.text && typeof parsed.text === 'string') {
                try {
                  const textSteps = JSON.parse(parsed.text);
                  if (Array.isArray(textSteps)) {
                    for (const step of textSteps) {
                      if (step.step_type === 'FINAL' && step.content && step.content.answer) {
                        try {
                          const answerData = JSON.parse(step.content.answer);
                          if (answerData.answer) {
                            aiResponse = answerData.answer;
                            
                            setMessages(prev => prev.map(msg => 
                              msg.id === loadingMessage.id 
                                ? { ...msg, content: aiResponse, isLoading: false }
                                : msg
                            ));
                            return;
                          }
                        } catch {
                          // Se não conseguir parsear, usar conteúdo direto
                          if (step.content.answer) {
                            aiResponse = step.content.answer;
                            
                            setMessages(prev => prev.map(msg => 
                              msg.id === loadingMessage.id 
                                ? { ...msg, content: aiResponse, isLoading: false }
                                : msg
                            ));
                            return;
                          }
                        }
                      }
                    }
                  }
                } catch {
                  // Se não conseguir parsear como JSON, usar como texto simples
                  aiResponse = parsed.text;
                  
                  setMessages(prev => prev.map(msg => 
                    msg.id === loadingMessage.id 
                      ? { ...msg, content: aiResponse, isLoading: false }
                      : msg
                  ));
                  return;
                }
              }

              // Processar delta streaming (formato alternativo)
              if (parsed.delta && typeof parsed.delta === 'string') {
                aiResponse += parsed.delta;
                
                setMessages(prev => {
                  const updatedMessages = [...prev];
                  const messageIndex = updatedMessages.findIndex(msg => msg.id === loadingMessage.id);
                  if (messageIndex !== -1) {
                    updatedMessages[messageIndex] = {
                      ...updatedMessages[messageIndex],
                      content: aiResponse,
                      isLoading: false,
                      timestamp: new Date()
                    };
                  }
                  return updatedMessages;
                });
              }

              // Processar content direto
              if (parsed.content && typeof parsed.content === 'string') {
                aiResponse += parsed.content;
                
                setMessages(prev => {
                  const updatedMessages = [...prev];
                  const messageIndex = updatedMessages.findIndex(msg => msg.id === loadingMessage.id);
                  if (messageIndex !== -1) {
                    updatedMessages[messageIndex] = {
                      ...updatedMessages[messageIndex],
                      content: aiResponse,
                      isLoading: false,
                      timestamp: new Date()
                    };
                  }
                  return updatedMessages;
                });
              }

            } catch (parseError) {
              // Se não conseguir parsear JSON, tratar como texto simples e adicionar ao streaming
              if (data !== '[DONE]' && data.trim()) {
                // Verificar se é um JSON válido antes de adicionar
                try {
                  const testParse = JSON.parse(data);
                  // Se conseguiu parsear mas chegou aqui, significa que não tem os campos esperados
                  // Não exibir JSON bruto para o usuário
                  return;
                } catch {
                  // É texto simples, pode adicionar
                  aiResponse += data;
                  
                  setMessages(prev => {
                    const updatedMessages = [...prev];
                    const messageIndex = updatedMessages.findIndex(msg => msg.id === loadingMessage.id);
                    if (messageIndex !== -1) {
                      updatedMessages[messageIndex] = {
                        ...updatedMessages[messageIndex],
                        content: aiResponse,
                        isLoading: false,
                        timestamp: new Date()
                      };
                    }
                    return updatedMessages;
                  });
                }
              }
            }
          }
        }
      }

      aiResponse = aiResponse.trim();

      if (!aiResponse) {
        aiResponse = 'Desculpe, não consegui processar sua pergunta no momento. Posso ajudar com organização de tarefas, definição de prioridades ou dicas de produtividade. O que você gostaria de saber?';
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { ...msg, content: aiResponse, isLoading: false }
            : msg
        ));
      }

    } catch (error) {
      let errorMessage = 'Erro de conexão com a IA.';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Para usar o chat com IA, você precisa iniciar o servidor Python:\n\n1. Abra um terminal\n2. Execute: cd perplexity\n3. Execute: python perplexity_working.py\n\nO servidor deve mostrar: "Iniciando servidor OpenAI-compat..."';
      } else if (error.message.includes('servidor Python')) {
        errorMessage = error.message;
      } else {
        errorMessage = `Erro: ${error.message}`;
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: errorMessage, isLoading: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div key={renderKey} className="flex flex-col h-screen bg-gray-50 pb-42">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">Assistente IA</h1>
            <p className="text-xs text-gray-500">
              {isLoading ? 'Analisando suas tarefas...' : 'Online'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-indigo-500 text-white ml-auto'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                }`}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">Pensando...</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}
                
                <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-indigo-100' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 pb-22">
        <div className="max-w-md mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua pergunta..."
                className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm max-h-32"
                rows={1}
                style={{
                  minHeight: '48px',
                  height: 'auto'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={`p-3 rounded-2xl transition-all ${
                inputMessage.trim() && !isLoading
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Status indicator */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></div>
                Conectado com IA • Processando...
              </span>
            ) : (
              <span>Digite Enter para enviar • Shift+Enter para nova linha</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
