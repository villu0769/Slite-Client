<template>
    <div class="dashboard">
        <h1>Admin Dashboard</h1>
        
        <div class="stats-container">
            <div class="stat-card">
                <h2>Monthly Projects</h2>
                <canvas ref="projectsChart"></canvas>
            </div>
            
            <div class="stat-card">
                <h2>Monthly Registered Users</h2>
                <canvas ref="usersChart"></canvas>
            </div>
        </div>
    </div>
</template>

<script>
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default {
    name: 'Dashboard',
    data() {
        return {
            projectsChart: null,
            usersChart: null,
            monthlyData: {
                months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                projects: [12, 19, 8, 15, 22, 18, 25, 20, 16, 28, 24, 30],
                users: [45, 52, 48, 61, 73, 68, 85, 79, 82, 95, 88, 102]
            }
        };
    },
    mounted() {
        this.initCharts();
    },
    methods: {
        initCharts() {
            // Projects Chart
            const projectsCtx = this.$refs.projectsChart.getContext('2d');
            this.projectsChart = new Chart(projectsCtx, {
                type: 'line',
                data: {
                    labels: this.monthlyData.months,
                    datasets: [{
                        label: 'Projects',
                        data: this.monthlyData.projects,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });

            // Users Chart
            const usersCtx = this.$refs.usersChart.getContext('2d');
            this.usersChart = new Chart(usersCtx, {
                type: 'bar',
                data: {
                    labels: this.monthlyData.months,
                    datasets: [{
                        label: 'Registered Users',
                        data: this.monthlyData.users,
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }
};
</script>

<style scoped>
.dashboard {
    padding: 2rem;
    background:var(--bg-soft);
    color:var(--text);
    width: 100%;height: 100%;
}

h1 {
    margin-bottom: 2rem;
    font-size: 2rem;
}

.stats-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 2rem;
}

.stat-card {
    background: var(--bg);
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card h2 {
    margin-bottom: 1rem;
    color: #374151;
    font-size: 1.25rem;
}
</style>