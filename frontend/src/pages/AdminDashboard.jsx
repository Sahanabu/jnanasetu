// Path: frontend/src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function useAdminAPI() {
  const { token } = useAuth();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const apiFetch = useCallback(async (url, options = {}) => {
    const response = await fetch(`${BACKEND_URL}${url}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [token]);

  return { apiFetch };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { apiFetch } = useAdminAPI();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [mappings, setMappings] = useState({ mappings: [], unmappedStudents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student', grade: '7', language: 'en' });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Mapping states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('7');
  const [gradeTeacher, setGradeTeacher] = useState('');
  const [gradeMappingLoading, setGradeMappingLoading] = useState(false);
  const [gradeMappingResult, setGradeMappingResult] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [statsData, usersData, mappingsData] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/mappings'),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setMappings(mappingsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowUserForm(false);
      setFormData({ name: '', email: '', password: '', role: 'student', grade: '7', language: 'en' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateUser(id) {
    try {
      const updates = {};
      if (formData.name) updates.name = formData.name;
      if (formData.email) updates.email = formData.email;
      if (formData.password) updates.password = formData.password;
      if (formData.role) updates.role = formData.role;
      if (formData.grade) updates.grade = parseInt(formData.grade);
      if (formData.language) updates.language = formData.language;

      await apiFetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'student', grade: '7', language: 'en' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleActive(id, currentStatus) {
    try {
      await apiFetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMapStudent() {
    if (!selectedStudent || !selectedTeacher) return;
    try {
      await apiFetch('/api/admin/map', {
        method: 'POST',
        body: JSON.stringify({ studentId: selectedStudent, teacherId: selectedTeacher }),
      });
      setSelectedStudent('');
      setSelectedTeacher('');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGradeMapping() {
    if (!selectedGrade || !gradeTeacher) return;
    setGradeMappingLoading(true);
    setGradeMappingResult('');
    try {
      const result = await apiFetch('/api/admin/map-grade', {
        method: 'POST',
        body: JSON.stringify({ grade: parseInt(selectedGrade), teacherId: gradeTeacher }),
      });
      setGradeMappingResult({ type: 'success', message: result.message });
      setGradeTeacher('');
      loadData();
    } catch (err) {
      setGradeMappingResult({ type: 'error', message: err.message });
    } finally {
      setGradeMappingLoading(false);
    }
  }

  async function handleUnmapStudent(studentId) {
    try {
      await apiFetch('/api/admin/unmap', {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const teachers = users.filter((u) => u.role === 'teacher' && u.isActive);
  const students = users.filter((u) => u.role === 'student' && u.isActive);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚙️</span>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-violet-600">Home</button>
              <button onClick={logout} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'users', label: '👥 Users', icon: '👥' },
              { id: 'mappings', label: '🔗 Mappings', icon: '🔗' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        {/* ─── Overview Tab ─── */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">System Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Students', value: stats.totalStudents, icon: '🎒', color: 'bg-violet-50 border-violet-200' },
                { label: 'Total Teachers', value: stats.totalTeachers, icon: '👩‍🏫', color: 'bg-indigo-50 border-indigo-200' },
                { label: 'Admins', value: stats.totalAdmins, icon: '⚙️', color: 'bg-emerald-50 border-emerald-200' },
                { label: 'Active Today', value: stats.activeToday, icon: '🌟', color: 'bg-amber-50 border-amber-200' },
                { label: 'Mapped Students', value: stats.mappedStudents, icon: '🔗', color: 'bg-blue-50 border-blue-200' },
                { label: 'Unmapped', value: stats.unmappedStudents, icon: '🔓', color: 'bg-orange-50 border-orange-200' },
                { label: 'Total Events', value: stats.totalEvents, icon: '📝', color: 'bg-cyan-50 border-cyan-200' },
                { label: 'Events Today', value: stats.eventsToday, icon: '⚡', color: 'bg-rose-50 border-rose-200' },
              ].map((stat, i) => (
                <div key={i} className={`rounded-xl border-2 p-4 ${stat.color}`}>
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => { setActiveTab('users'); setShowUserForm(true); }} className="p-4 bg-violet-50 rounded-xl border border-violet-200 text-left hover:bg-violet-100 transition-all">
                  <div className="text-xl mb-1">➕</div>
                  <div className="font-medium text-gray-800 text-sm">Add New User</div>
                  <div className="text-xs text-gray-500">Create student, teacher, or admin</div>
                </button>
                <button onClick={() => setActiveTab('mappings')} className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-left hover:bg-indigo-100 transition-all">
                  <div className="text-xl mb-1">🔗</div>
                  <div className="font-medium text-gray-800 text-sm">Manage Mappings</div>
                  <div className="text-xs text-gray-500">Map students to teachers</div>
                </button>
                <button onClick={loadData} className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-left hover:bg-emerald-100 transition-all">
                  <div className="text-xl mb-1">🔄</div>
                  <div className="font-medium text-gray-800 text-sm">Refresh Data</div>
                  <div className="text-xs text-gray-500">Sync latest statistics</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Users Tab ─── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-800">User Management</h2>
              <button
                onClick={() => { setShowUserForm(true); setEditingUser(null); setFormData({ name: '', email: '', password: '', role: 'student', grade: '7', language: 'en' }); }}
                className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all"
              >
                + Add User
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm bg-white"
              >
                <option value="">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {/* User Form Modal */}
            {(showUserForm || editingUser) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                  <form onSubmit={editingUser ? (e) => { e.preventDefault(); handleUpdateUser(editingUser._id); } : handleCreateUser} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password {editingUser && '(leave blank to keep)'}</label>
                      <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm" required={!editingUser} minLength={6} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm bg-white">
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                        <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm bg-white">
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="flex-1 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all">
                        {editingUser ? 'Update' : 'Create'}
                      </button>
                      <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Grade</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                        <td className="px-4 py-3 text-gray-500">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' :
                            u.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-violet-100 text-violet-700'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.grade || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs ${u.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                            <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setEditingUser(u); setFormData({ name: u.name, email: u.email, password: '', role: u.role, grade: String(u.grade || 7), language: u.language }); }} className="px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 rounded transition-all">Edit</button>
                            <button onClick={() => handleToggleActive(u._id, u.isActive)} className={`px-2 py-1 text-xs rounded transition-all ${u.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => handleDeleteUser(u._id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-all">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-lg disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-lg disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Mappings Tab ─── */}
        {activeTab === 'mappings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Teacher-Student Mappings</h2>

            {/* ═══ Grade-wise Bulk Mapping ═══ */}
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border-2 border-indigo-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">📦</span>
                <h3 className="font-semibold text-gray-800">Grade-wise Bulk Mapping</h3>
                <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Fast</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Map all students of a selected grade to a teacher in one click — saves time vs. mapping one-by-one.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm bg-white"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
                <select
                  value={gradeTeacher}
                  onChange={(e) => setGradeTeacher(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm bg-white"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                  ))}
                </select>
                <button
                  onClick={handleGradeMapping}
                  disabled={!selectedGrade || !gradeTeacher || gradeMappingLoading}
                  className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {gradeMappingLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mapping...
                    </>
                  ) : (
                    '📦 Map All →'
                  )}
                </button>
              </div>
              {gradeMappingResult && (
                <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
                  gradeMappingResult.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {gradeMappingResult.type === 'success' ? '✅ ' : '⚠️ '}
                  {gradeMappingResult.message}
                </div>
              )}
            </div>

            {/* Map individual student */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🔗</span>
                <h3 className="font-semibold text-gray-800">Map Individual Student</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">One-by-one</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm bg-white"
                >
                  <option value="">Select a student...</option>
                  {mappings.unmappedStudents?.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.email}) - Grade {s.grade}</option>
                  ))}
                </select>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:outline-none text-sm bg-white"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                  ))}
                </select>
                <button
                  onClick={handleMapStudent}
                  disabled={!selectedStudent || !selectedTeacher}
                  className="px-6 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-all"
                >
                  Map →
                </button>
              </div>
              {mappings.unmappedStudents?.length === 0 && (
                <p className="mt-2 text-xs text-emerald-600">✅ All students are mapped to teachers!</p>
              )}
            </div>

            {/* Current mappings */}

            <div className="space-y-4">
              {mappings.mappings?.map((mapping) => (
                <div key={mapping.teacher._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👩‍🏫</span>
                        <span className="font-semibold text-gray-800">{mapping.teacher.name}</span>
                        <span className="text-xs text-gray-500">({mapping.teacher.email})</span>
                      </div>
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                        {mapping.studentCount} students
                      </span>
                    </div>
                  </div>
                  {mapping.students.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {mapping.students.map((s) => (
                        <div key={s._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🎒</span>
                            <div>
                              <span className="text-sm font-medium text-gray-800">{s.name}</span>
                              <span className="text-xs text-gray-500 ml-2">Grade {s.grade}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnmapStudent(s._id)}
                            className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            Unmap
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      No students mapped yet
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
