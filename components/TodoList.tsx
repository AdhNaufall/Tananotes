"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';

interface TodoItem {
  _id: string;
  text: string;
  completed: boolean;
}

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/todos');
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async () => {
    if (newTodo.trim()) {
      try {
        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newTodo.trim(), completed: false }),
        });
        if (response.ok) {
          const created = await response.json();
          setTodos([...todos, created]);
          setNewTodo('');
          setIsAdding(false);
        }
      } catch (error) {
        console.error('Error adding todo:', error);
      }
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t._id === id);
    if (!todo) return;

    try {
      const response = await fetch(`/api/todos?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      if (response.ok) {
        setTodos(todos.map(t =>
          t._id === id ? { ...t, completed: !t.completed } : t
        ));
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setTodos(todos.filter(todo => todo._id !== id));
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  return (
    <div className="relative pt-4 pl-4">
      {/* Circle overlapping the box corner */}
      <div className="absolute top-3 left-0 w-10 h-10 rounded-full border-2 border-black bg-[#93C5FD] z-20"></div>
      
      {/* Title next to circle */}
      <h2 className="absolute top-0 left-12 text-[17px] font-bold tracking-wide text-black z-20">To-do list</h2>
      
      {/* Main content box */}
      <div className="bg-white border-2 border-black rounded-[28px] md:rounded-[36px] w-full p-5 pt-8 mt-3 relative min-h-[180px] z-10">
        <div className="space-y-2 mb-3 max-h-[150px] overflow-y-auto">
          {loading ? (
            <div className="text-sm font-semibold text-gray-400 text-center py-2">Loading...</div>
          ) : todos.length === 0 ? (
            <div className="text-sm font-semibold text-gray-400 text-center py-2">No tasks yet</div>
          ) : (
            todos.map((todo) => (
              <div key={todo._id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleTodo(todo._id)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 border-black flex items-center justify-center transition-colors ${
                    todo.completed ? 'bg-[#93C5FD]' : 'bg-white'
                  }`}
                >
                  {todo.completed && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-sm font-semibold ${todo.completed ? 'line-through opacity-50' : ''}`}>
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo._id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add New Todo */}
        {isAdding ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTodo();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewTodo('');
                }
              }}
              placeholder="Type your task..."
              autoFocus
              className="flex-1 px-3 py-2 text-sm border-2 border-black rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
            />
            <button
              onClick={addTodo}
              className="px-3 py-2 bg-[#93C5FD] border-2 border-black rounded-xl font-bold hover:-translate-y-0.5 transition-transform"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}
