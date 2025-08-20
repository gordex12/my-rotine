'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon, TrophyIcon, FireIcon } from '@heroicons/react/24/outline';

export default function StatsPage({ tasks }) {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const getCurrentDay = () => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[new Date().getDay()];
  };

  const getCurrentTabBasedOnDay = () => {
    const today = new Date().getDay();
    return (today === 0 || today === 6) ? 'weekends' : 'weekdays';
  };

  const getTodayTasks = () => {
    const currentTab = getCurrentTabBasedOnDay();
    return tasks[currentTab] || [];
  };

  const getAllTasks = () => {
    return [...(tasks.weekdays || []), ...(tasks.weekends || [])];
  };

  const getTasksForPeriod = () => {
    switch (selectedPeriod) {
      case 'today':
        return getTodayTasks();
      case 'week':
        return getAllTasks();
      default:
        return getTodayTasks();
    }
  };

  const calculateStats = () => {
    const periodTasks = getTasksForPeriod();
    const totalTasks = periodTasks.length;
    const completedTasks = periodTasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Tarefas com horário
    const tasksWithTime = periodTasks.filter(task => task.time).length;
    const tasksWithoutTime = totalTasks - tasksWithTime;

    // Tarefas por período do dia
    const morningTasks = periodTasks.filter(task => {
      if (!task.time) return false;
      const hour = parseInt(task.time.split(':')[0]);
      return hour >= 6 && hour < 12;
    }).length;

    const afternoonTasks = periodTasks.filter(task => {
      if (!task.time) return false;
      const hour = parseInt(task.time.split(':')[0]);
      return hour >= 12 && hour < 18;
    }).length;

    const eveningTasks = periodTasks.filter(task => {
      if (!task.time) return false;
      const hour = parseInt(task.time.split(':')[0]);
      return hour >= 18 || hour < 6;
    }).length;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate,
      tasksWithTime,
      tasksWithoutTime,
      morningTasks,
      afternoonTasks,
      eveningTasks
    };
  };

  const stats = calculateStats();

  const getMotivationalMessage = () => {
    if (stats.completionRate === 100 && stats.totalTasks > 0) {
      return "🎉 Parabéns! Você completou todas as suas tarefas!";
    } else if (stats.completionRate >= 80) {
      return "🔥 Excelente progresso! Continue assim!";
    } else if (stats.completionRate >= 50) {
      return "💪 Você está no caminho certo! Vamos lá!";
    } else if (stats.completionRate > 0) {
      return "🌱 Todo progresso conta! Continue tentando!";
    } else {
      return "🚀 Hora de começar! Suas metas estão esperando!";
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = "indigo" }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
        </div>
        <div className={`p-3 bg-${color}-50 rounded-xl`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Estatísticas</h1>
            <p className="text-sm text-gray-600">{getCurrentDay()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6">
        {/* Period Selector */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setSelectedPeriod('today')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              selectedPeriod === 'today'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              selectedPeriod === 'week'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Geral
          </button>
        </div>

        {/* Motivational Message */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 mb-6 text-white">
          <div className="flex items-center space-x-3">
            <TrophyIcon className="w-8 h-8" />
            <div>
              <p className="font-medium">{getMotivationalMessage()}</p>
              <p className="text-indigo-100 text-sm mt-1">
                {stats.completionRate}% das tarefas concluídas
              </p>
            </div>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-500"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={`${stats.completionRate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{stats.completionRate}%</span>
                <span className="text-sm text-gray-500">Concluído</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600">
              {stats.completedTasks} de {stats.totalTasks} tarefas concluídas
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard
            title="Total de Tarefas"
            value={stats.totalTasks}
            icon={CalendarIcon}
            color="blue"
          />
          <StatCard
            title="Concluídas"
            value={stats.completedTasks}
            icon={CheckCircleIcon}
            color="green"
          />
          <StatCard
            title="Pendentes"
            value={stats.pendingTasks}
            icon={XCircleIcon}
            color="orange"
          />
          <StatCard
            title="Com Horário"
            value={stats.tasksWithTime}
            icon={ClockIcon}
            color="purple"
          />
        </div>

        {/* Time Distribution */}
        {stats.totalTasks > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2" />
              Distribuição por Período
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">🌅 Manhã (6h-12h)</span>
                <span className="font-medium">{stats.morningTasks} tarefas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">☀️ Tarde (12h-18h)</span>
                <span className="font-medium">{stats.afternoonTasks} tarefas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">🌙 Noite (18h-6h)</span>
                <span className="font-medium">{stats.eveningTasks} tarefas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">⏰ Sem horário</span>
                <span className="font-medium">{stats.tasksWithoutTime} tarefas</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalTasks === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-gray-500">
              {selectedPeriod === 'today' 
                ? 'Adicione tarefas para ver suas estatísticas de hoje'
                : 'Crie algumas tarefas para acompanhar seu progresso'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
