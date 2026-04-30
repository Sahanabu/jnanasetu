import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessagesPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [visibleContactsCount, setVisibleContactsCount] = useState(15);
  const messagesEndRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // Load contacts
  useEffect(() => {
    async function loadContacts() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/messages/contacts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setContacts(data);
          if (data.length > 0) {
            setActiveContact(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContacts();
  }, [token]);

  // Load messages when active contact changes
  useEffect(() => {
    if (!activeContact) return;
    
    async function loadMessages() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/messages/thread/${activeContact._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          scrollToBottom();
          
          // Clear unread count locally
          setContacts(prev => prev.map(c => 
            c._id === activeContact._id ? { ...c, unreadCount: 0 } : c
          ));
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }
    
    loadMessages();
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [activeContact, token]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    setSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: activeContact._id,
          content: newMessage.trim()
        })
      });
      
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleClearConversation = async () => {
    if (!activeContact) return;
    if (!window.confirm(`Are you sure you want to clear the entire conversation with ${activeContact.name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/messages/thread/${activeContact._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to clear conversation:', err);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || contact.grade?.toString() === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const visibleContacts = filteredContacts.slice(0, visibleContactsCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Messages</h1>
                <p className="text-xs text-gray-500">
                  {user?.role === 'student' ? 'Chat with your teacher' : 'Chat with your students'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(user?.role === 'student' ? '/learn' : '/teacher')}
              className="text-sm font-medium text-gray-500 hover:text-violet-600"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Interface */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-6 h-[calc(100vh-4rem)]">
        
        {/* Contacts Sidebar */}
        <div className={`w-full md:w-80 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden ${activeContact ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Inbox</h2>
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full uppercase">
                {contacts.length} total
              </span>
            </div>
            
            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input 
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-200 transition-all"
                />
              </div>
              
              {user?.role === 'teacher' && (
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {['all', '6', '7', '8', '9', '10'].map(grade => (
                    <button
                      key={grade}
                      onClick={() => setGradeFilter(grade)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all ${
                        gradeFilter === grade 
                          ? 'bg-violet-600 border-violet-600 text-white shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-500 hover:border-violet-300'
                      }`}
                    >
                      {grade === 'all' ? 'All Grades' : `Grade ${grade}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400">
                <div className="text-3xl mb-2">🔭</div>
                No students found.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {visibleContacts.map(contact => (
                  <button
                    key={contact._id}
                    onClick={() => setActiveContact(contact)}
                    className={`w-full text-left p-4 flex items-center gap-3 hover:bg-violet-50 transition-colors ${activeContact?._id === contact._id ? 'bg-violet-50 border-l-4 border-violet-600' : ''}`}
                  >
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-600 font-black text-lg border border-violet-200">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate text-sm">{contact.name}</h3>
                      <p className="text-[11px] text-gray-500 truncate">{user?.role === 'teacher' ? `Grade ${contact.grade}` : 'Primary Teacher'}</p>
                    </div>
                    {contact.unreadCount > 0 && (
                      <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {contact.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
                
                {visibleContactsCount < filteredContacts.length && (
                  <button
                    onClick={() => setVisibleContactsCount(prev => prev + 20)}
                    className="w-full py-4 text-xs font-bold text-violet-600 hover:bg-violet-50 transition-all uppercase tracking-widest"
                  >
                    Load More Students
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeContact ? (
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveContact(null)}
                  className="md:hidden text-gray-500 hover:text-gray-800"
                >
                  ←
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                  {activeContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">{activeContact.name}</h2>
                  <p className="text-xs text-emerald-600 font-medium">● Online</p>
                </div>
              </div>
              <button
                onClick={handleClearConversation}
                className="px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
              >
                Clear Chat
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <span className="text-4xl mb-2">👋</span>
                  <p>Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.senderId === user._id;
                  return (
                    <motion.div 
                      key={msg._id || idx} 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex group ${isMine ? 'justify-end' : 'justify-start'} relative`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative ${
                        isMine 
                          ? 'bg-violet-600 text-white rounded-tr-sm' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <div className="flex items-center justify-between mt-1 gap-4">
                          {isMine && (
                            <button
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-violet-200 hover:text-white transition-opacity"
                              title="Delete message"
                            >
                              Clear
                            </button>
                          )}
                          <p className={`text-[10px] flex-1 text-right ${isMine ? 'text-violet-200' : 'text-gray-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-gray-100 border-transparent focus:bg-white focus:border-violet-500 rounded-xl focus:outline-none transition-all"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex-col items-center justify-center text-gray-400 p-6">
            <span className="text-6xl mb-4">💬</span>
            <h3 className="text-lg font-medium text-gray-600">Your Messages</h3>
            <p className="text-sm text-center mt-2 max-w-sm">
              Select a contact from the sidebar to view your conversation or start a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
