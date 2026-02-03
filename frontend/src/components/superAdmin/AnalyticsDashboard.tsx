import React from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import '../../styles/AdminDashboard.css'; // Reusing admin styles

interface AnalyticsDashboardProps {
    data: {
        userDistribution: { _id: string; count: number }[];
        bookDistribution: { _id: string; count: number }[];
        readlistTrends: { _id: number; month: string; count: number }[];
        orderTrends: { _id: number; month: string; count: number; revenue: number }[];
    };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
    // Prepare data for charts with defensive checks
    const userData = (data.userDistribution || []).map(item => ({ name: item._id, value: item.count }));
    const bookData = (data.bookDistribution || []).map(item => ({ name: item._id, value: item.count }));
    const readlistData = (data.readlistTrends || []).map(item => ({ name: item.month, reads: item.count }));
    const orderData = (data.orderTrends || []).map(item => ({
        name: item.month,
        orders: item.count,
        revenue: item.revenue
    }));

    return (
        <div className="analytics-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Pie Charts Section */}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

                {/* User Distribution */}
                <div className="card stats-card-content" style={{ flex: 1, minWidth: '300px', padding: '1.5rem', display: 'block' }}>
                    <h3 className="stats-label" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>User Distribution</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={userData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {userData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Book Categories */}
                <div className="card stats-card-content" style={{ flex: 1, minWidth: '300px', padding: '1.5rem', display: 'block' }}>
                    <h3 className="stats-label" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Book Categories</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={bookData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    fill="#82ca9d"
                                    dataKey="value"
                                    label
                                >
                                    {bookData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Trends Bar Charts Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Readlist Trends */}
                <div className="card stats-card-content" style={{ padding: '1.5rem', display: 'block' }}>
                    <h3 className="stats-label" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Readlist Trends (Last 6 Months)</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={readlistData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="reads" fill="#8884d8" name="Books Added to Readlist" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Order & Revenue Trends */}
                <div className="card stats-card-content" style={{ padding: '1.5rem', display: 'block' }}>
                    <h3 className="stats-label" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Order & Revenue Trends (Last 6 Months)</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={orderData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Total Orders" />
                                <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue (₹)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
