import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate, Link } from 'react-router-dom';
import { Download } from 'lucide-react';

interface DashboardData {
    test_id: number;
    user_name: string;
    execution_time: string;
    duration_seconds: number;
    persona_name: string;
    summary: string;
}

const AdminDashboardPage: React.FC = () => {
    const [data, setData] = useState<DashboardData[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await apiClient.get<DashboardData[]>('/v1/admin/dashboard');
                setData(result);
            } catch (error: any) {
                console.error('Failed to fetch dashboard data:', error);
                if (error.response && error.response.status === 403) {
                    alert("관리자 권한이 없습니다.");
                    navigate('/main');
                } else if (error.response && error.response.status === 401) {
                    alert("로그인이 필요합니다.");
                    navigate('/');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    // Process data for charts
    const personaCounts = data.reduce((acc, curr) => {
        acc[curr.persona_name] = (acc[curr.persona_name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(personaCounts).map(([name, value]) => ({
        name,
        value,
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    const handleDownloadCSV = () => {
        // Define headers
        const headers = ['Test ID', 'Time', 'Duration (s)', 'User', 'Persona', 'Result Summary'];

        // Map data to rows
        const rows = data.map(item => [
            item.test_id,
            new Date(item.execution_time).toLocaleString(),
            item.duration_seconds || '',
            item.user_name,
            item.persona_name,
            `"${item.summary?.replace(/"/g, '""') || ''}"` // Escape quotes in summary
        ]);

        // Combine headers and rows
        // Add BOM for Excel to correctly recognize UTF-8
        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `test_execution_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    <button
                        onClick={() => navigate('/main')}
                        className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-300 shadow-sm transition-colors"
                    >
                        Back to Main
                    </button>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Persona Distribution</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Overview</h2>
                        <div className="flex flex-col justify-center h-64">
                            <div className="text-center">
                                <p className="text-6xl font-bold text-blue-600 mb-2">{data.length}</p>
                                <p className="text-gray-500 font-medium">Total Tests Conducted</p>
                            </div>
                            <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-2xl font-bold text-gray-800">{pieData.length}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Unique Personas</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-2xl font-bold text-gray-800">
                                        {data.length > 0 ? new Date(data[0].execution_time).toLocaleDateString() : '-'}
                                    </p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Last Activity</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800">Test Execution Logs</h2>
                        <button
                            onClick={handleDownloadCSV}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors duration-200 font-medium"
                        >
                            <Download size={18} />
                            Download CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (s)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Persona</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result Summary</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.map((item) => (
                                    <tr key={item.test_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(item.execution_time).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {item.duration_seconds !== undefined && item.duration_seconds !== null ? `${item.duration_seconds}s` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.user_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {item.persona_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                                            <Link
                                                to={`/result-detail/${item.test_id}`}
                                                className="text-blue-600 hover:text-blue-900 hover:underline block truncate"
                                                title={item.summary}
                                            >
                                                {item.summary || "View Details"}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No test results found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AdminDashboardPage;
