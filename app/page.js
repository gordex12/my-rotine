'use client';

import { useState, useEffect } from 'react';
import BottomNavigation from './components/BottomNavigation';
import RoutinePage from './components/RoutinePage';
import StatsPage from './components/StatsPage';
import ChatPage from './components/ChatPage';

export default function Home() {
  const [currentPage, setCurrentPage] = useState('home');
  const [tasks, setTasks] = useState({
    weekdays: [],
    weekends: []
  });

  // Carregar tarefas do localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem('daily-routine-tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  // Salvar tarefas no localStorage
  useEffect(() => {
    localStorage.setItem('daily-routine-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <RoutinePage tasks={tasks} setTasks={setTasks} />;
      case 'stats':
        return <StatsPage tasks={tasks} />;
      case 'chat':
        return <ChatPage tasks={tasks} />;
      default:
        return <RoutinePage tasks={tasks} setTasks={setTasks} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {renderCurrentPage()}
      <BottomNavigation 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
}
