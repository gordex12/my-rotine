'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, ClockIcon, TrashIcon, PencilIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, CogIcon } from '@heroicons/react/24/outline';

export default function RoutinePage({ tasks, setTasks }) {
  const [newTask, setNewTask] = useState({ title: '', description: '', time: '', hasTime: false });
  const [editingTask, setEditingTask] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState('weekdays');

  // Determinar qual aba mostrar baseado no dia atual
  const getCurrentTabBasedOnDay = () => {
    const today = new Date().getDay();
    return (today === 0 || today === 6) ? 'weekends' : 'weekdays';
  };

  // Aba ativa baseada no modo
  const activeTab = isEditMode ? selectedTab : getCurrentTabBasedOnDay();

  const addTask = () => {
    if (!newTask.title.trim()) return;
    
    const task = {
      id: Date.now(),
      title: newTask.title,
      description: newTask.description,
      time: newTask.hasTime ? newTask.time : null,
      completed: false
    };

    setTasks(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], task]
    }));

    setNewTask({ title: '', description: '', time: '', hasTime: false });
    setShowAddForm(false);
  };

  const deleteTask = (id) => {
    setTasks(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(task => task.id !== id)
    }));
  };

  const toggleTask = (id) => {
    setTasks(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    }));
  };

  const startEdit = (task) => {
    setEditingTask({
      ...task,
      hasTime: !!task.time
    });
  };

  const saveEdit = () => {
    setTasks(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(task =>
        task.id === editingTask.id 
          ? { 
              ...editingTask, 
              time: editingTask.hasTime ? editingTask.time : null 
            }
          : task
      )
    }));
    setEditingTask(null);
  };

  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getCurrentDay = () => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[new Date().getDay()];
  };

  const getProgressPercentage = () => {
    const currentTasks = tasks[activeTab];
    if (currentTasks.length === 0) return 0;
    const completedTasks = currentTasks.filter(task => task.completed).length;
    return Math.round((completedTasks / currentTasks.length) * 100);
  };

  // Organizar tarefas por horário
  const getSortedTasks = () => {
    const currentTasks = [...tasks[activeTab]];
    return currentTasks.sort((a, b) => {
      // Tarefas sem horário vão para o final
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      
      // Comparar horários
      return a.time.localeCompare(b.time);
    });
  };

  const getTabLabel = (tab) => {
    return tab === 'weekdays' ? 'Dias de Semana' : 'Fins de Semana';
  };

  const getCurrentModeLabel = () => {
    if (isEditMode) {
      return `Editando: ${getTabLabel(selectedTab)}`;
    }
    return `Hoje: ${getTabLabel(activeTab)}`;
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Minha Rotina</h1>
              <p className="text-sm text-gray-600">{getCurrentDay()}</p>
            </div>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`absolute right-4 p-3 rounded-xl transition-all flex-shrink-0 ${
                isEditMode 
                  ? 'bg-indigo-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CogIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mode Indicator */}
          <div className="text-center mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
              isEditMode 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {getCurrentModeLabel()}
            </span>
          </div>
          
          {/* Progress Ring */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
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
                  strokeDasharray={`${getProgressPercentage()}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-900">{getProgressPercentage()}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4">
        {/* Tab Navigation - Only in Edit Mode */}
        {isEditMode && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6 mt-6">
            <button
              onClick={() => setSelectedTab('weekdays')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                selectedTab === 'weekdays'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dias de Semana
            </button>
            <button
              onClick={() => setSelectedTab('weekends')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                selectedTab === 'weekends'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Fins de Semana
            </button>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-3 mb-6 mt-6">
          {getSortedTasks().map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                task.completed ? 'bg-gray-50 border-gray-200' : 'border-gray-100 hover:shadow-md'
              }`}
            >
              {editingTask && editingTask.id === task.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nome da tarefa"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <textarea
                    placeholder="Descrição (opcional)"
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows="2"
                  />
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingTask.hasTime}
                        onChange={(e) => setEditingTask({ ...editingTask, hasTime: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-600">Horário específico</span>
                    </label>
                    {editingTask.hasTime && (
                      <input
                        type="time"
                        value={editingTask.time || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, time: e.target.value })}
                        className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 bg-indigo-500 text-white py-2 rounded-lg font-medium hover:bg-indigo-600 transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingTask(null)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          task.completed
                            ? 'bg-indigo-500 border-indigo-500 text-white'
                            : 'border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {task.completed && <CheckIcon className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <button
                              onClick={() => toggleTaskExpansion(task.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {expandedTasks.has(task.id) ? (
                                <ChevronUpIcon className="w-4 h-4" />
                              ) : (
                                <ChevronDownIcon className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                        {task.time && (
                          <div className="flex items-center space-x-1 mt-1">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">{task.time}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Edit/Delete buttons only in edit mode */}
                    {isEditMode && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEdit(task)}
                          className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Expanded Description */}
                  {task.description && expandedTasks.has(task.id) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                        {task.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {getSortedTasks().length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isEditMode ? 'Nenhuma tarefa ainda' : 'Nenhuma tarefa para hoje'}
              </h3>
              <p className="text-gray-500 mb-6">
                {isEditMode 
                  ? 'Comece criando sua primeira tarefa' 
                  : 'Ative o modo de edição para gerenciar suas tarefas'
                }
              </p>
            </div>
          )}
        </div>

        {/* Add Task Form - Only in Edit Mode */}
        {isEditMode && showAddForm && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome da tarefa"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows="2"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newTask.hasTime}
                    onChange={(e) => setNewTask({ ...newTask, hasTime: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">Horário específico</span>
                </label>
                {newTask.hasTime && (
                  <input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={addTask}
                  className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-medium hover:bg-indigo-600 transition-colors"
                >
                  Adicionar Tarefa
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTask({ title: '', description: '', time: '', hasTime: false });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Button - Only in Edit Mode */}
        {isEditMode && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center space-x-2 shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nova Tarefa</span>
          </button>
        )}
      </div>
    </div>
  );
}
