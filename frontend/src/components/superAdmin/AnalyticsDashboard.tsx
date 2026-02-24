import React from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import '../../styles/AdminDashboard.css'; // Reusing admin styles

interface AnalyticsDashboardProps {
    data: {
        totalBooks: number;
        admins: number;
        totalOrders: number;
        totalRevenue: number;
        avgFulfillmentTime: number;
        averageOrderValue: number;
        cancellationRate: number;
        realizedOrderCount: number;
        userDistribution: { _id: string; count: number }[];
        membershipDistribution: { _id: string; count: number }[];
        bookDistribution: { _id: string; count: number }[];
        readlistTrends: { _id: number; month: string; count: number }[];
        orderTrends: { _id: number; month: string; count: number; revenue: number }[];
    };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
    // Prepare data for charts with defensive checks
    const userData = (data.userDistribution || []).map(item => ({ name: item._id, value: item.count }));
    const membershipData = (data.membershipDistribution || []).map(item => ({ name: item._id, value: item.count }));
    const bookData = (data.bookDistribution || []).map(item => ({ name: item._id, value: item.count }));
    const readlistData = (data.readlistTrends || []).map(item => ({ name: item.month, reads: item.count }));
    const orderData = (data.orderTrends || []).map(item => ({
        name: item.month,
        orders: item.count,
        revenue: item.revenue
    }));

    return (
        <div className="analytics-page-container">

            {/* Pie Charts Section */}
            <div className="analytics-row flex-row">

                {/* User & Membership Distribution */}
                <div className="card stats-card-content analytics-card demographics-card">
                    <h3 className="stats-label">User Demographics</h3>
                    <div className="demographics-grid">
                        {/* Role Distribution */}
                        <div className="chart-container">
                            <h4 className="chart-sub-label">By Role</h4>
                            <div className="responsive-chart-wrapper">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={userData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={70}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label={({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = outerRadius + 10;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                // Determine text anchor based on position
                                                const textAnchor = x > cx ? 'start' : 'end';

                                                return (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        fill="#64748b"
                                                        textAnchor={textAnchor}
                                                        dominantBaseline="central"
                                                        className="chart-label-text"
                                                    >
                                                        {`${name} ${(percent * 100).toFixed(0)}%`}
                                                    </text>
                                                );
                                            }}
                                        >
                                            {userData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="demographics-divider"></div>

                        {/* Membership Distribution */}
                        <div className="chart-container">
                            <h4 className="chart-sub-label">By Membership</h4>
                            <div className="responsive-chart-wrapper">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={membershipData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={70}
                                            fill="#82ca9d"
                                            dataKey="value"
                                            label={({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = outerRadius + 10;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                const textAnchor = x > cx ? 'start' : 'end';

                                                return (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        fill="#64748b"
                                                        textAnchor={textAnchor}
                                                        dominantBaseline="central"
                                                        className="chart-label-text"
                                                    >
                                                        {`${name} ${(percent * 100).toFixed(0)}%`}
                                                    </text>
                                                );
                                            }}
                                        >
                                            {membershipData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Book Categories */}
                <div className="card stats-card-content analytics-card categories-card">
                    <h3 className="stats-label">Book Categories</h3>
                    <div className="responsive-chart-wrapper categories-chart-height">
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
            <div className="analytics-row-stack">
                {/* Readlist Trends */}
                <div className="card stats-card-content analytics-card-full">
                    <h3 className="stats-label">Readlist Trends (Last 6 Months)</h3>
                    <div className="trend-chart-wrapper">
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
                <div className="card stats-card-content analytics-card-full">
                    <h3 className="stats-label">Order & Revenue Trends (Last 6 Months)</h3>
                    <div className="trend-chart-wrapper revenue-chart-height">
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
