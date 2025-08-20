# My Routine - Aplicativo de Rotina Diária

Um aplicativo mobile-first para gerenciamento de rotinas diárias com IA integrada, desenvolvido em Next.js.

## 🚀 Funcionalidades

### 📋 Gerenciamento de Tarefas
- **Tarefas por período**: Diferentes listas para dias de semana e fins de semana
- **Horários opcionais**: Adicione horários específicos às suas tarefas
- **CRUD completo**: Criar, editar, excluir e marcar tarefas como concluídas
- **Persistência local**: Suas tarefas são salvas automaticamente no navegador
- **Modo de edição**: Interface limpa para visualização e edição separadas

### 📊 Estatísticas Detalhadas
- **Métricas de progresso**: Acompanhe sua produtividade ao longo do tempo
- **Distribuição por horário**: Veja quando você é mais produtivo
- **Filtros por período**: Analise dados de hoje, semana ou mês
- **Mensagens motivacionais**: Receba feedback baseado no seu desempenho

### 🤖 Chat com IA
- **Assistente inteligente**: IA que analisa suas tarefas em tempo real
- **Streaming de respostas**: Respostas em tempo real com tecnologia SSE
- **Contexto das tarefas**: A IA conhece sua rotina e oferece dicas personalizadas
- **Dicas de produtividade**: Conselhos baseados em seus hábitos e padrões

### 🎨 Design
- **Mobile-first**: Otimizado para dispositivos móveis
- **Interface moderna**: Design limpo inspirado em apps de hábitos populares
- **Navegação intuitiva**: Menu inferior com três seções principais
- **Animações suaves**: Transições e feedbacks visuais agradáveis

## 🛠️ Tecnologias

- **Next.js 14** - Framework React
- **Tailwind CSS** - Estilização
- **Heroicons** - Ícones
- **LocalStorage** - Persistência de dados
- **Server-Sent Events** - Streaming de IA
- **Perplexity AI** - Inteligência artificial

## 📦 Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd my-rotine
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o Chat com IA (Opcional)

Para usar o chat com IA, você precisa configurar o servidor Python:

#### Instalar dependências Python:
```bash
pip install curl-cffi fastapi uvicorn requests
```

#### Iniciar o servidor de IA:
```bash
cd perplexity
python perplexity_working.py
```

O servidor será iniciado automaticamente e mostrará o IP da sua máquina:
```
Iniciando servidor OpenAI-compat em modo bloqueante: http://192.168.1.100:8000/v1
Servidor também acessível via: http://0.0.0.0:8000/v1
```

**Nota**: O servidor agora aceita conexões de qualquer IP da rede, permitindo acesso de outros dispositivos.

### 4. Execute o aplicativo
```bash
npm run dev
```

Acesse `http://localhost:3000` no seu navegador.

## 🎯 Como Usar

### Gerenciar Tarefas
1. **Visualizar**: Na página inicial, veja suas tarefas organizadas por horário
2. **Editar**: Toque no botão de edição no canto superior direito
3. **Adicionar**: Use o botão "+" para criar novas tarefas
4. **Completar**: Marque tarefas como concluídas tocando no círculo
5. **Alternar período**: No modo edição, alterne entre semana e fins de semana

### Ver Estatísticas
1. Acesse a aba "Estatísticas" no menu inferior
2. Veja métricas de progresso e distribuição por horário
3. Use os filtros para analisar diferentes períodos
4. Acompanhe mensagens motivacionais baseadas no seu desempenho

### Chat com IA
1. **Sem servidor Python**: O chat funcionará com respostas básicas simuladas
2. **Com servidor Python**: 
   - Execute: `python perplexity/perplexity_working.py`
   - O servidor detectará automaticamente o IP da sua máquina
   - A aplicação React encontrará automaticamente o servidor Python
   - Faça perguntas sobre suas tarefas, produtividade ou organização
   - A IA analisará suas tarefas em tempo real e oferecerá dicas personalizadas
   - As respostas são transmitidas em tempo real via streaming

### Exemplos de Perguntas para a IA
- "Como está meu progresso hoje?"
- "Que dicas você tem para melhorar minha produtividade?"
- "Qual a melhor forma de organizar minha rotina matinal?"
- "Analise meus horários e sugira melhorias"

## 🔧 Estrutura do Projeto

```
my-rotine/
├── app/
│   ├── components/
│   │   ├── BottomNavigation.js    # Menu de navegação
│   │   ├── RoutinePage.js         # Página principal de tarefas
│   │   ├── StatsPage.js           # Página de estatísticas
│   │   └── ChatPage.js            # Chat com IA
│   ├── api/
│   │   └── chat.js                # Endpoint para IA
│   ├── globals.css                # Estilos globais
│   ├── layout.js                  # Layout principal
│   └── page.js                    # Página inicial
├── perplexity/
│   ├── chat_client.py             # Cliente original (referência)
│   └── perplexity_working.py      # Servidor IA funcional
└── public/                        # Arquivos estáticos
```

## 🚨 Solução de Problemas

### Chat com IA não funciona
1. **Verifique se o servidor Python está rodando**:
   ```bash
   cd perplexity
   python perplexity_working.py
   ```

2. **Instale as dependências Python**:
   ```bash
   pip install curl-cffi fastapi uvicorn requests
   ```

3. **Verifique a conexão**: 
   - O servidor agora usa o IP da sua máquina (ex: `http://192.168.1.100:8000`)
   - A aplicação React detecta automaticamente o servidor
   - Se necessário, defina manualmente: `PYTHON_API_URL=http://SEU_IP:8000`

4. **Acesso de outros dispositivos**:
   - O servidor aceita conexões de qualquer IP da rede
   - Outros dispositivos na mesma rede podem acessar o chat
   - Use o IP mostrado na inicialização do servidor

### Tarefas não são salvas
- As tarefas são salvas no LocalStorage do navegador
- Limpar dados do navegador apagará suas tarefas
- Use sempre o mesmo navegador e dispositivo

### Interface não responsiva
- O app é otimizado para mobile
- Use as ferramentas de desenvolvedor para simular dispositivos móveis
- Recomendado: largura de 375px-414px para melhor experiência

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🎉 Próximas Funcionalidades

- [ ] Sincronização em nuvem
- [ ] Notificações push
- [ ] Temas personalizáveis
- [ ] Backup/restore de dados
- [ ] Integração com calendários
- [ ] Relatórios em PDF
