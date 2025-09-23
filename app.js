// RepTrack - Complete Fitness Tracking Webapp
// Supabase Configuration - Replace with your own values
const SUPABASE_URL = 'https://ivjgipulwxvtejhixiva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2amdpcHVsd3h2dGVqaGl4aXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjA1NzMsImV4cCI6MjA3NDIzNjU3M30.yUa1LCVaUd_WpW9Ayjpun2TOpdfQDSvi9yDZsfVzI_o';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentUser = null;
let workouts = [];
let teams = [];
let teamMembers = [];
let publicUsers = [];
let progressChart = null;
let draggedWorkout = null;

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const mainApp = document.getElementById('mainApp');
const loadingOverlay = document.getElementById('loadingOverlay');

// Auth elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginTab = document.querySelector('[data-tab="login"]');
const signupTab = document.querySelector('[data-tab="signup"]');
const authMessage = document.getElementById('authMessage');

// Main app elements
const addWorkoutBtn = document.getElementById('addWorkoutBtn');
const createTeamBtn = document.getElementById('createTeamBtn');
const logoutBtn = document.getElementById('logoutBtn');
const refreshWorkouts = document.getElementById('refreshWorkouts');

// Stats elements
const totalWorkouts = document.getElementById('totalWorkouts');
const totalReps = document.getElementById('totalReps');
const currentStreak = document.getElementById('currentStreak');
const rank = document.getElementById('rank');

// Workout elements
const workoutsList = document.getElementById('workoutsList');
const workoutsSkeleton = document.getElementById('workoutsSkeleton');
const noWorkouts = document.getElementById('noWorkouts');

// Chart elements
const progressChartCanvas = document.getElementById('progressChart');
const chartExercise = document.getElementById('chartExercise');

// Team elements
const teamLeaderboard = document.getElementById('teamLeaderboard');
const teamLeaderboardSkeleton = document.getElementById('teamLeaderboardSkeleton');
const noTeam = document.getElementById('noTeam');
const joinTeamBtn = document.getElementById('joinTeamBtn');

// Public leaderboard elements
const publicLeaderboard = document.getElementById('publicLeaderboard');
const publicLeaderboardSkeleton = document.getElementById('publicLeaderboardSkeleton');
const noPublic = document.getElementById('noPublic');
const togglePublic = document.getElementById('togglePublic');

// Modal elements
const addWorkoutModal = document.getElementById('addWorkoutModal');
const createTeamModal = document.getElementById('createTeamModal');
const joinTeamModal = document.getElementById('joinTeamModal');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkAuthState();
});

// Initialize the application
function initializeApp() {
    console.log('RepTrack initialized');
    
    // Setup Chart.js
    initializeChart();
    
    // Setup drag and drop
    setupDragAndDrop();
}

// Setup all event listeners
function setupEventListeners() {
    // Auth event listeners
    loginTab.addEventListener('click', () => switchTab('login'));
    signupTab.addEventListener('click', () => switchTab('signup'));
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    
    // Main app event listeners
    logoutBtn.addEventListener('click', handleLogout);
    addWorkoutBtn.addEventListener('click', () => showModal('addWorkout'));
    createTeamBtn.addEventListener('click', () => showModal('createTeam'));
    joinTeamBtn.addEventListener('click', () => showModal('joinTeam'));
    refreshWorkouts.addEventListener('click', loadWorkouts);
    togglePublic.addEventListener('click', togglePublicLeaderboard);
    
    // Modal event listeners
    setupModalListeners();
    
    // Chart event listeners
    chartExercise.addEventListener('change', updateChart);
}

// Setup modal event listeners
function setupModalListeners() {
    // Add workout modal
    document.getElementById('closeWorkoutModal').addEventListener('click', () => hideModal('addWorkout'));
    document.getElementById('cancelWorkout').addEventListener('click', () => hideModal('addWorkout'));
    document.getElementById('workoutForm').addEventListener('submit', handleAddWorkout);
    
    // Create team modal
    document.getElementById('closeTeamModal').addEventListener('click', () => hideModal('createTeam'));
    document.getElementById('cancelTeam').addEventListener('click', () => hideModal('createTeam'));
    document.getElementById('teamForm').addEventListener('submit', handleCreateTeam);
    
    // Join team modal
    document.getElementById('closeJoinModal').addEventListener('click', () => hideModal('joinTeam'));
    
    // Close modals on outside click
    [addWorkoutModal, createTeamModal, joinTeamModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id.replace('Modal', ''));
            }
        });
    });
}

// Authentication Functions
async function checkAuthState() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth check error:', error);
            return;
        }
        
        if (user) {
            currentUser = user;
            await initializeUserData();
            showMainApp();
        } else {
            showLoginOverlay();
        }
    } catch (error) {
        console.error('Auth state check failed:', error);
        showLoginOverlay();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        await initializeUserData();
        showMainApp();
        showMessage('Login successful!', 'success');
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleSignup(e) {
    e.preventDefault();
    showLoading();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const publicLeaderboard = document.getElementById('publicLeaderboard').checked;
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    public_leaderboard: publicLeaderboard
                }
            }
        });
        
        if (error) throw error;
        
        showMessage('Account created! Please check your email to verify your account.', 'success');
        
        // Clear form
        document.getElementById('signupForm').reset();
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        workouts = [];
        teams = [];
        teamMembers = [];
        publicUsers = [];
        showLoginOverlay();
        showMessage('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Logout failed', 'error');
    }
}

// User Data Initialization
async function initializeUserData() {
    if (!currentUser) return;
    
    showLoading();
    
    try {
        // Load user data in parallel
        await Promise.all([
            loadWorkouts(),
            loadTeams(),
            loadTeamMembers(),
            loadPublicUsers(),
            updateUserStats()
        ]);
        
        // Setup realtime subscriptions
        setupRealtimeSubscriptions();
        
    } catch (error) {
        console.error('Failed to initialize user data:', error);
        showMessage('Failed to load data', 'error');
    } finally {
        hideLoading();
    }
}

// Workout Management
async function loadWorkouts() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        workouts = data || [];
        renderWorkouts();
        updateChart();
        updateUserStats();
    } catch (error) {
        console.error('Failed to load workouts:', error);
        showMessage('Failed to load workouts', 'error');
    }
}

function renderWorkouts() {
    hideSkeleton('workoutsSkeleton');
    
    if (workouts.length === 0) {
        showEmptyState('noWorkouts');
        return;
    }
    
    hideEmptyState('noWorkouts');
    
    workoutsList.innerHTML = workouts.map(workout => `
        <div class="workout-item" data-workout-id="${workout.id}" draggable="true">
            <div class="workout-info">
                <h4>${workout.exercise_name}</h4>
                <p>${workout.sets} set${workout.sets > 1 ? 's' : ''} • ${workout.weight}kg • ${workout.reps} reps</p>
                ${workout.notes ? `<p class="workout-notes">${workout.notes}</p>` : ''}
            </div>
            <div class="workout-stats">
                <div>${workout.sets * workout.reps} total reps</div>
                <div class="workout-date">${formatDate(workout.created_at)}</div>
            </div>
            <div class="workout-actions">
                <button class="delete-btn" onclick="deleteWorkout(${workout.id})" title="Delete workout">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
    
    // Add animation to new items
    const workoutItems = workoutsList.querySelectorAll('.workout-item');
    workoutItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
        item.classList.add('slide-up');
    });
}

async function handleAddWorkout(e) {
    e.preventDefault();
    
    const exerciseName = document.getElementById('exerciseName').value;
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const reps = parseInt(document.getElementById('reps').value);
    const sets = parseInt(document.getElementById('sets').value);
    const notes = document.getElementById('notes').value;
    
    try {
        const { data, error } = await supabase
            .from('workouts')
            .insert([{
                user_id: currentUser.id,
                exercise_name: exerciseName,
                weight: weight,
                reps: reps,
                sets: sets,
                notes: notes
            }])
            .select();
        
        if (error) throw error;
        
        // Add to local array
        workouts.unshift(data[0]);
        renderWorkouts();
        updateUserStats();
        updateChart();
        
        // Clear form and close modal
        document.getElementById('workoutForm').reset();
        hideModal('addWorkout');
        showMessage('Workout added successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to add workout:', error);
        showMessage('Failed to add workout', 'error');
    }
}

async function deleteWorkout(workoutId) {
    if (!confirm('Are you sure you want to delete this workout?')) return;
    
    try {
        const { error } = await supabase
            .from('workouts')
            .delete()
            .eq('id', workoutId);
        
        if (error) throw error;
        
        // Remove from local array
        workouts = workouts.filter(w => w.id !== workoutId);
        renderWorkouts();
        updateUserStats();
        updateChart();
        
        showMessage('Workout deleted successfully', 'success');
        
    } catch (error) {
        console.error('Failed to delete workout:', error);
        showMessage('Failed to delete workout', 'error');
    }
}

// Team Management
async function loadTeams() {
    try {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        teams = data || [];
        renderTeamLeaderboard();
        renderAvailableTeams();
    } catch (error) {
        console.error('Failed to load teams:', error);
    }
}

async function loadTeamMembers() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('team_members')
            .select(`
                *,
                teams(*),
                users(*)
            `)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        teamMembers = data || [];
        renderTeamLeaderboard();
    } catch (error) {
        console.error('Failed to load team members:', error);
    }
}

async function handleCreateTeam(e) {
    e.preventDefault();
    
    const teamName = document.getElementById('teamName').value;
    const teamDescription = document.getElementById('teamDescription').value;
    
    try {
        const { data, error } = await supabase
            .from('teams')
            .insert([{
                name: teamName,
                description: teamDescription,
                created_by: currentUser.id
            }])
            .select();
        
        if (error) throw error;
        
        // Add user as team member
        await supabase
            .from('team_members')
            .insert([{
                team_id: data[0].id,
                user_id: currentUser.id,
                joined_at: new Date().toISOString()
            }]);
        
        // Reload data
        await loadTeams();
        await loadTeamMembers();
        
        // Clear form and close modal
        document.getElementById('teamForm').reset();
        hideModal('createTeam');
        showMessage('Team created successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to create team:', error);
        showMessage('Failed to create team', 'error');
    }
}

async function joinTeam(teamId) {
    try {
        const { error } = await supabase
            .from('team_members')
            .insert([{
                team_id: teamId,
                user_id: currentUser.id,
                joined_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        // Reload data
        await loadTeamMembers();
        hideModal('joinTeam');
        showMessage('Joined team successfully!', 'success');
        
    } catch (error) {
        console.error('Failed to join team:', error);
        showMessage('Failed to join team', 'error');
    }
}

function renderTeamLeaderboard() {
    hideSkeleton('teamLeaderboardSkeleton');
    
    if (teamMembers.length === 0) {
        showEmptyState('noTeam');
        return;
    }
    
    hideEmptyState('noTeam');
    
    // Get team workouts for all team members
    const teamId = teamMembers[0]?.team_id;
    if (!teamId) return;
    
    // Calculate team stats
    const teamStats = calculateTeamStats(teamId);
    
    teamLeaderboard.innerHTML = teamStats.map((member, index) => `
        <div class="leaderboard-item rank-${index + 1}">
            <div class="rank">${index + 1}</div>
            <div class="leaderboard-info">
                <h4>${member.name}</h4>
                <p>${member.total_workouts} workouts</p>
            </div>
            <div class="leaderboard-stats">
                ${member.total_reps} reps
            </div>
        </div>
    `).join('');
}

function renderAvailableTeams() {
    hideSkeleton('availableTeamsSkeleton');
    
    const availableTeams = teams.filter(team => 
        !teamMembers.some(member => member.team_id === team.id)
    );
    
    if (availableTeams.length === 0) {
        document.getElementById('availableTeams').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No teams available</h3>
                <p>All teams are full or you're already a member!</p>
            </div>
        `;
        return;
    }
    
    document.getElementById('availableTeams').innerHTML = availableTeams.map(team => `
        <div class="team-item" onclick="joinTeam(${team.id})">
            <h4>${team.name}</h4>
            <p>${team.description || 'No description'}</p>
            <div class="team-meta">
                <span>Created ${formatDate(team.created_at)}</span>
                <span>${team.member_count || 0} members</span>
            </div>
        </div>
    `).join('');
}

// Public Leaderboard
async function loadPublicUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`
                id,
                name,
                public_leaderboard,
                workouts(count)
            `)
            .eq('public_leaderboard', true);
        
        if (error) throw error;
        
        publicUsers = data || [];
        renderPublicLeaderboard();
    } catch (error) {
        console.error('Failed to load public users:', error);
    }
}

function renderPublicLeaderboard() {
    hideSkeleton('publicLeaderboardSkeleton');
    
    if (publicUsers.length === 0) {
        showEmptyState('noPublic');
        return;
    }
    
    hideEmptyState('noPublic');
    
    // Calculate public stats
    const publicStats = calculatePublicStats();
    
    publicLeaderboard.innerHTML = publicStats.map((user, index) => `
        <div class="leaderboard-item rank-${index + 1}">
            <div class="rank">${index + 1}</div>
            <div class="leaderboard-info">
                <h4>${user.name}</h4>
                <p>${user.total_workouts} workouts</p>
            </div>
            <div class="leaderboard-stats">
                ${user.total_reps} reps
            </div>
        </div>
    `).join('');
}

async function togglePublicLeaderboard() {
    if (!currentUser) return;
    
    try {
        const currentStatus = currentUser.user_metadata?.public_leaderboard || false;
        
        const { error } = await supabase.auth.updateUser({
            data: { public_leaderboard: !currentStatus }
        });
        
        if (error) throw error;
        
        // Reload public users
        await loadPublicUsers();
        
        const message = !currentStatus ? 'Public leaderboard enabled' : 'Public leaderboard disabled';
        showMessage(message, 'success');
        
    } catch (error) {
        console.error('Failed to toggle public leaderboard:', error);
        showMessage('Failed to update settings', 'error');
    }
}

// Chart Management
function initializeChart() {
    const ctx = progressChartCanvas.getContext('2d');
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Reps',
                data: [],
                borderColor: '#4facfe',
                backgroundColor: 'rgba(79, 172, 254, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ecf0f1'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#ecf0f1'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#ecf0f1'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function updateChart() {
    if (!progressChart) return;
    
    const selectedExercise = chartExercise.value;
    if (!selectedExercise) {
        progressChart.data.labels = [];
        progressChart.data.datasets[0].data = [];
        progressChart.update();
        return;
    }
    
    // Filter workouts by exercise
    const exerciseWorkouts = workouts
        .filter(w => w.exercise_name.toLowerCase() === selectedExercise.toLowerCase())
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    if (exerciseWorkouts.length === 0) {
        progressChart.data.labels = [];
        progressChart.data.datasets[0].data = [];
        progressChart.update();
        return;
    }
    
    // Prepare chart data
    const labels = exerciseWorkouts.map(w => formatDate(w.created_at));
    const data = exerciseWorkouts.map(w => w.sets * w.reps);
    
    progressChart.data.labels = labels;
    progressChart.data.datasets[0].data = data;
    progressChart.data.datasets[0].label = `${selectedExercise} - Total Reps`;
    progressChart.update();
}

function updateChartExerciseOptions() {
    const exercises = [...new Set(workouts.map(w => w.exercise_name))];
    
    chartExercise.innerHTML = '<option value="">Select Exercise</option>' +
        exercises.map(exercise => 
            `<option value="${exercise}">${exercise}</option>`
        ).join('');
}

// Drag and Drop
function setupDragAndDrop() {
    const workoutsContainer = document.getElementById('workoutsList');
    
    workoutsContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('workout-item')) {
            draggedWorkout = e.target;
            e.target.classList.add('dragging');
        }
    });
    
    workoutsContainer.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('workout-item')) {
            e.target.classList.remove('dragging');
            draggedWorkout = null;
        }
    });
    
    workoutsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(workoutsContainer, e.clientY);
        const dragging = document.querySelector('.dragging');
        
        if (afterElement == null) {
            workoutsContainer.appendChild(dragging);
        } else {
            workoutsContainer.insertBefore(dragging, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.workout-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Statistics Calculation
function calculateTeamStats(teamId) {
    // This would need to be implemented with proper team workout aggregation
    // For now, return mock data
    return teamMembers.map(member => ({
        name: member.users?.name || 'Unknown',
        total_workouts: Math.floor(Math.random() * 20),
        total_reps: Math.floor(Math.random() * 1000)
    })).sort((a, b) => b.total_reps - a.total_reps);
}

function calculatePublicStats() {
    // This would need to be implemented with proper public user aggregation
    // For now, return mock data
    return publicUsers.map(user => ({
        name: user.name || 'Unknown',
        total_workouts: Math.floor(Math.random() * 50),
        total_reps: Math.floor(Math.random() * 2000)
    })).sort((a, b) => b.total_reps - a.total_reps);
}

function updateUserStats() {
    const totalWorkoutsCount = workouts.length;
    const totalRepsCount = workouts.reduce((sum, workout) => sum + (workout.sets * workout.reps), 0);
    
    // Calculate streak (simplified)
    const streak = calculateStreak();
    
    // Update DOM
    totalWorkouts.textContent = totalWorkoutsCount;
    totalReps.textContent = totalRepsCount;
    currentStreak.textContent = streak;
    
    // Update rank (simplified)
    const userRank = calculateUserRank();
    rank.textContent = userRank || '-';
    
    // Update chart options
    updateChartExerciseOptions();
}

function calculateStreak() {
    if (workouts.length === 0) return 0;
    
    const today = new Date();
    const workoutDates = workouts.map(w => new Date(w.created_at).toDateString());
    const uniqueDates = [...new Set(workoutDates)];
    
    let streak = 0;
    let currentDate = new Date(today);
    
    while (true) {
        const dateString = currentDate.toDateString();
        if (uniqueDates.includes(dateString)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

function calculateUserRank() {
    // This would need to be implemented with proper ranking calculation
    // For now, return a random rank
    return Math.floor(Math.random() * 100) + 1;
}

// Realtime Subscriptions
function setupRealtimeSubscriptions() {
    if (!currentUser) return;
    
    // Subscribe to workout changes
    supabase
        .channel('workouts')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'workouts',
            filter: `user_id=eq.${currentUser.id}`
        }, () => {
            loadWorkouts();
        })
        .subscribe();
    
    // Subscribe to team changes
    supabase
        .channel('teams')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'teams'
        }, () => {
            loadTeams();
        })
        .subscribe();
    
    // Subscribe to team member changes
    supabase
        .channel('team_members')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'team_members'
        }, () => {
            loadTeamMembers();
        })
        .subscribe();
}

// UI Helper Functions
function switchTab(tab) {
    // Remove active class from all tabs and forms
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    // Add active class to selected tab and form
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
}

function showLoginOverlay() {
    loginOverlay.classList.remove('hidden');
    mainApp.classList.add('hidden');
}

function showMainApp() {
    loginOverlay.classList.add('hidden');
    mainApp.classList.remove('hidden');
    mainApp.classList.add('fade-in');
}

function showModal(modalName) {
    const modal = document.getElementById(`${modalName}Modal`);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('pop-in');
    }
}

function hideModal(modalName) {
    const modal = document.getElementById(`${modalName}Modal`);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('pop-in');
    }
}

function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
    authMessage.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 3000);
}

function showSkeleton(skeletonId) {
    const skeleton = document.getElementById(skeletonId);
    if (skeleton) {
        skeleton.classList.remove('hidden');
    }
}

function hideSkeleton(skeletonId) {
    const skeleton = document.getElementById(skeletonId);
    if (skeleton) {
        skeleton.classList.add('hidden');
    }
}

function showEmptyState(emptyStateId) {
    const emptyState = document.getElementById(emptyStateId);
    if (emptyState) {
        emptyState.classList.remove('hidden');
    }
}

function hideEmptyState(emptyStateId) {
    const emptyState = document.getElementById(emptyStateId);
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
}

// Error Handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showMessage('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showMessage('An unexpected error occurred', 'error');
});

// Export functions for global access
window.deleteWorkout = deleteWorkout;
window.joinTeam = joinTeam;
