// Supabase Configuration
// TODO: Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://owrojqutbtoifitqijdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cm9qcXV0YnRvaWZpdHFpamRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjQ3NjUsImV4cCI6MjA3MzcwMDc2NX0.ugj1qCdzDd_40ZqJE5pYuMarFOhLlT3ZU_8piIPt_Mc';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentUser = null;
let currentSection = 'workouts';
let workouts = [];
let teams = [];
let teamMembers = [];
let progressChart = null;

// DOM Elements
const elements = {
    // Navigation
    navMenu: document.getElementById('nav-menu'),
    navItems: document.querySelectorAll('.nav-item'),
    
    // Sections
    authSection: document.getElementById('auth-section'),
    appSection: document.getElementById('app-section'),
    sections: document.querySelectorAll('.section'),
    
    // Auth elements
    authBtn: document.getElementById('auth-btn'),
    profileBtn: document.getElementById('profile-btn'),
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    showSignup: document.getElementById('show-signup'),
    showLogin: document.getElementById('show-login'),
    loginBtn: document.getElementById('login-btn'),
    signupBtn: document.getElementById('signup-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Modals
    workoutModal: document.getElementById('workout-modal'),
    teamModal: document.getElementById('team-modal'),
    profileModal: document.getElementById('profile-modal'),
    
    // Loading
    loadingOverlay: document.getElementById('loading-overlay'),
    toastContainer: document.getElementById('toast-container'),
    
    // Lists/containers
    workoutsList: document.getElementById('workouts-list'),
    teamsGrid: document.getElementById('teams-grid'),
    leaderboardContainer: document.getElementById('leaderboard-container'),
    
    // Charts
    progressChart: document.getElementById('progress-chart'),
    exerciseSelect: document.getElementById('exercise-select'),
    timeframeSelect: document.getElementById('timeframe-select'),
    
    // Leaderboard
    leaderboardType: document.getElementById('leaderboard-type')
};

// Utility Functions
function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function calculateVolume(weight, reps, sets) {
    return (weight || 0) * reps * sets;
}

function generateSkeletonLoader(type, count = 3) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton ${type}`;
        skeletons.push(skeleton);
    }
    return skeletons;
}

// Authentication Functions
async function signUp(email, password, name, publicLeaderboard) {
    try {
        showLoading();
        
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
        
        showToast('Account created successfully! Please check your email to verify your account.', 'success');
        showLoginForm();
        
    } catch (error) {
        console.error('Signup error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function signIn(email, password) {
    try {
        showLoading();
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showToast('Welcome back!', 'success');
        await loadUserData();
        
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function signOut() {
    try {
        showLoading();
        
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        showToast('Signed out successfully', 'success');
        showAuthSection();
        
    } catch (error) {
        console.error('Signout error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function loadUserData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            currentUser = user;
            await loadUserProfile();
            await loadWorkouts();
            await loadTeams();
            showAppSection();
        } else {
            showAuthSection();
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showAuthSection();
    }
}

async function loadUserProfile() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        // Update profile form if modal is open
        if (elements.profileModal.classList.contains('active')) {
            document.getElementById('profile-name').value = data?.name || '';
            document.getElementById('profile-public-leaderboard').checked = data?.public_leaderboard || false;
        }
        
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

async function updateUserProfile(name, publicLeaderboard) {
    try {
        showLoading();
        
        const { error } = await supabase
            .from('users')
            .upsert({
                id: currentUser.id,
                name,
                public_leaderboard: publicLeaderboard,
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        showToast('Profile updated successfully!', 'success');
        closeModal('profile-modal');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Workout Functions
async function loadWorkouts() {
    try {
        showLoading();
        
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        workouts = data || [];
        renderWorkouts();
        updateExerciseSelect();
        
    } catch (error) {
        console.error('Error loading workouts:', error);
        showToast('Failed to load workouts', 'error');
    } finally {
        hideLoading();
    }
}

function renderWorkouts() {
    if (workouts.length === 0) {
        elements.workoutsList.innerHTML = `
            <div class="text-center text-muted">
                <p>No workouts yet. Add your first workout to get started!</p>
            </div>
        `;
        return;
    }
    
    elements.workoutsList.innerHTML = workouts.map(workout => `
        <div class="workout-card" data-id="${workout.id}">
            <div class="workout-header">
                <h3 class="workout-title">${workout.exercise_name}</h3>
                <div class="workout-actions">
                    <button onclick="editWorkout(${workout.id})" title="Edit">
                        ✏️
                    </button>
                    <button onclick="deleteWorkout(${workout.id})" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="workout-details">
                <div class="workout-stat">
                    <div class="workout-stat-label">Weight</div>
                    <div class="workout-stat-value">${workout.weight || 0} kg</div>
                </div>
                <div class="workout-stat">
                    <div class="workout-stat-label">Reps</div>
                    <div class="workout-stat-value">${workout.reps}</div>
                </div>
                <div class="workout-stat">
                    <div class="workout-stat-label">Sets</div>
                    <div class="workout-stat-value">${workout.sets}</div>
                </div>
                <div class="workout-stat">
                    <div class="workout-stat-label">Volume</div>
                    <div class="workout-stat-value">${calculateVolume(workout.weight, workout.reps, workout.sets)} kg</div>
                </div>
            </div>
            ${workout.notes ? `<div class="workout-notes">${workout.notes}</div>` : ''}
            <div class="workout-date">${formatDate(workout.created_at)}</div>
        </div>
    `).join('');
    
    // Enable drag and drop
    enableDragAndDrop();
}

async function addWorkout(workoutData) {
    try {
        showLoading();
        
        const { data, error } = await supabase
            .from('workouts')
            .insert({
                ...workoutData,
                user_id: currentUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        workouts.unshift(data);
        renderWorkouts();
        showToast('Workout added successfully!', 'success');
        closeModal('workout-modal');
        resetWorkoutForm();
        
    } catch (error) {
        console.error('Error adding workout:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function updateWorkout(workoutId, workoutData) {
    try {
        showLoading();
        
        const { data, error } = await supabase
            .from('workouts')
            .update({
                ...workoutData,
                updated_at: new Date().toISOString()
            })
            .eq('id', workoutId)
            .eq('user_id', currentUser.id)
            .select()
            .single();
        
        if (error) throw error;
        
        const index = workouts.findIndex(w => w.id === workoutId);
        if (index !== -1) {
            workouts[index] = data;
            renderWorkouts();
        }
        
        showToast('Workout updated successfully!', 'success');
        closeModal('workout-modal');
        resetWorkoutForm();
        
    } catch (error) {
        console.error('Error updating workout:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteWorkout(workoutId) {
    if (!confirm('Are you sure you want to delete this workout?')) {
        return;
    }
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('workouts')
            .delete()
            .eq('id', workoutId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        workouts = workouts.filter(w => w.id !== workoutId);
        renderWorkouts();
        showToast('Workout deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting workout:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function editWorkout(workoutId) {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    document.getElementById('workout-modal-title').textContent = 'Edit Workout';
    document.getElementById('exercise-name').value = workout.exercise_name;
    document.getElementById('weight').value = workout.weight || '';
    document.getElementById('reps').value = workout.reps;
    document.getElementById('sets').value = workout.sets;
    document.getElementById('notes').value = workout.notes || '';
    
    // Store workout ID for update
    document.getElementById('workout-form').dataset.workoutId = workoutId;
    
    showModal('workout-modal');
}

function resetWorkoutForm() {
    document.getElementById('workout-form').reset();
    document.getElementById('workout-form').removeAttribute('data-workout-id');
    document.getElementById('workout-modal-title').textContent = 'Add Workout';
}

// Team Functions
async function loadTeams() {
    try {
        const { data, error } = await supabase
            .from('teams')
            .select(`
                *,
                team_members!inner(user_id)
            `)
            .eq('team_members.user_id', currentUser.id);
        
        if (error) throw error;
        
        teams = data || [];
        renderTeams();
        
    } catch (error) {
        console.error('Error loading teams:', error);
        showToast('Failed to load teams', 'error');
    }
}

function renderTeams() {
    if (teams.length === 0) {
        elements.teamsGrid.innerHTML = `
            <div class="text-center text-muted">
                <p>You're not part of any teams yet. Create or join a team to start competing!</p>
            </div>
        `;
        return;
    }
    
    elements.teamsGrid.innerHTML = teams.map(team => `
        <div class="team-card">
            <div class="team-header">
                <h3 class="team-name">${team.name}</h3>
            </div>
            <div class="team-description">${team.description || 'No description'}</div>
            <div class="team-stats">
                <div class="team-stat">
                    <div class="team-stat-label">Members</div>
                    <div class="team-stat-value">${team.team_members?.length || 0}</div>
                </div>
                <div class="team-stat">
                    <div class="team-stat-label">Created</div>
                    <div class="team-stat-value">${formatDate(team.created_at).split(',')[0]}</div>
                </div>
            </div>
            <div class="team-actions">
                <button class="btn btn-secondary" onclick="viewTeamLeaderboard(${team.id})">
                    View Leaderboard
                </button>
                <button class="btn btn-danger" onclick="leaveTeam(${team.id})">
                    Leave Team
                </button>
            </div>
        </div>
    `).join('');
}

async function createTeam(teamData) {
    try {
        showLoading();
        
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({
                ...teamData,
                created_by: currentUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (teamError) throw teamError;
        
        // Add creator as team member
        const { error: memberError } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: currentUser.id,
                joined_at: new Date().toISOString()
            });
        
        if (memberError) throw memberError;
        
        await loadTeams();
        showToast('Team created successfully!', 'success');
        closeModal('team-modal');
        resetTeamForm();
        
    } catch (error) {
        console.error('Error creating team:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function resetTeamForm() {
    document.getElementById('team-form').reset();
}

async function leaveTeam(teamId) {
    if (!confirm('Are you sure you want to leave this team?')) {
        return;
    }
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        await loadTeams();
        showToast('Left team successfully!', 'success');
        
    } catch (error) {
        console.error('Error leaving team:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Progress Chart Functions
function updateExerciseSelect() {
    const exercises = [...new Set(workouts.map(w => w.exercise_name))].sort();
    
    elements.exerciseSelect.innerHTML = `
        <option value="">All Exercises</option>
        ${exercises.map(exercise => `
            <option value="${exercise}">${exercise}</option>
        `).join('')}
    `;
}

function renderProgressChart() {
    if (!elements.progressChart) return;
    
    const ctx = elements.progressChart.getContext('2d');
    
    // Destroy existing chart
    if (progressChart) {
        progressChart.destroy();
    }
    
    const selectedExercise = elements.exerciseSelect.value;
    const timeframe = elements.timeframeSelect.value;
    
    let filteredWorkouts = workouts;
    
    // Filter by exercise
    if (selectedExercise) {
        filteredWorkouts = filteredWorkouts.filter(w => w.exercise_name === selectedExercise);
    }
    
    // Filter by timeframe
    if (timeframe !== 'all') {
        const days = parseInt(timeframe);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        filteredWorkouts = filteredWorkouts.filter(w => 
            new Date(w.created_at) >= cutoffDate
        );
    }
    
    // Group by date and calculate totals
    const dataMap = new Map();
    
    filteredWorkouts.forEach(workout => {
        const date = new Date(workout.created_at).toDateString();
        const volume = calculateVolume(workout.weight, workout.reps, workout.sets);
        
        if (dataMap.has(date)) {
            dataMap.get(date).volume += volume;
            dataMap.get(date).count += 1;
        } else {
            dataMap.set(date, {
                date: new Date(workout.created_at),
                volume: volume,
                count: 1
            });
        }
    });
    
    const chartData = Array.from(dataMap.values())
        .sort((a, b) => a.date - b.date)
        .slice(-30); // Show last 30 data points
    
    if (chartData.length === 0) {
        ctx.clearRect(0, 0, elements.progressChart.width, elements.progressChart.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No data to display', elements.progressChart.width / 2, elements.progressChart.height / 2);
        return;
    }
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date.toLocaleDateString()),
            datasets: [{
                label: 'Total Volume (kg)',
                data: chartData.map(d => d.volume),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
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
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Leaderboard Functions
async function loadLeaderboard(type = 'personal') {
    try {
        showLoading();
        
        let data = [];
        
        switch (type) {
            case 'personal':
                data = await loadPersonalStats();
                break;
            case 'team':
                data = await loadTeamLeaderboard();
                break;
            case 'public':
                data = await loadPublicLeaderboard();
                break;
        }
        
        renderLeaderboard(data, type);
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showToast('Failed to load leaderboard', 'error');
    } finally {
        hideLoading();
    }
}

async function loadPersonalStats() {
    const stats = {
        totalWorkouts: workouts.length,
        totalVolume: workouts.reduce((sum, w) => sum + calculateVolume(w.weight, w.reps, w.sets), 0),
        uniqueExercises: new Set(workouts.map(w => w.exercise_name)).size,
        avgWorkoutsPerWeek: calculateWeeklyAverage(workouts)
    };
    
    return [{
        rank: 1,
        name: currentUser.user_metadata?.name || 'You',
        stats: stats,
        score: stats.totalVolume
    }];
}

async function loadTeamLeaderboard() {
    // This would load team-specific leaderboards
    // For now, return empty array
    return [];
}

async function loadPublicLeaderboard() {
    // This would load public leaderboard data
    // For now, return empty array
    return [];
}

function calculateWeeklyAverage(workouts) {
    if (workouts.length === 0) return 0;
    
    const firstWorkout = new Date(Math.min(...workouts.map(w => new Date(w.created_at))));
    const daysDiff = (new Date() - firstWorkout) / (1000 * 60 * 60 * 24);
    const weeks = Math.max(1, daysDiff / 7);
    
    return Math.round(workouts.length / weeks * 10) / 10;
}

function renderLeaderboard(data, type) {
    if (data.length === 0) {
        elements.leaderboardContainer.innerHTML = `
            <div class="text-center text-muted">
                <p>No data available for this leaderboard type.</p>
            </div>
        `;
        return;
    }
    
    if (type === 'personal') {
        const stats = data[0].stats;
        elements.leaderboardContainer.innerHTML = `
            <div class="personal-stats">
                <h3>Your Fitness Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalWorkouts}</div>
                        <div class="stat-label">Total Workouts</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalVolume.toLocaleString()} kg</div>
                        <div class="stat-label">Total Volume</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.uniqueExercises}</div>
                        <div class="stat-label">Unique Exercises</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.avgWorkoutsPerWeek}</div>
                        <div class="stat-label">Avg/Week</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    elements.leaderboardContainer.innerHTML = data.map((item, index) => `
        <div class="leaderboard-item">
            <div class="leaderboard-rank">${item.rank}</div>
            <div class="leaderboard-user">
                <div class="leaderboard-name">${item.name}</div>
                <div class="leaderboard-stats">${item.stats ? Object.entries(item.stats).map(([key, value]) => `${key}: ${value}`).join(' • ') : ''}</div>
            </div>
            <div class="leaderboard-score">${item.score.toLocaleString()}</div>
        </div>
    `).join('');
}

// Drag and Drop Functions
function enableDragAndDrop() {
    const workoutCards = document.querySelectorAll('.workout-card');
    
    workoutCards.forEach(card => {
        card.draggable = true;
        
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.id);
            card.style.opacity = '0.5';
        });
        
        card.addEventListener('dragend', (e) => {
            card.style.opacity = '1';
        });
        
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const targetId = card.dataset.id;
            
            if (draggedId !== targetId) {
                reorderWorkouts(draggedId, targetId);
            }
        });
    });
}

function reorderWorkouts(draggedId, targetId) {
    const draggedIndex = workouts.findIndex(w => w.id == draggedId);
    const targetIndex = workouts.findIndex(w => w.id == targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedWorkout] = workouts.splice(draggedIndex, 1);
        workouts.splice(targetIndex, 0, draggedWorkout);
        renderWorkouts();
    }
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function showAuthSection() {
    elements.authSection.classList.remove('hidden');
    elements.appSection.classList.add('hidden');
    elements.authBtn.textContent = 'Login';
    elements.profileBtn.style.display = 'none';
}

function showAppSection() {
    elements.authSection.classList.add('hidden');
    elements.appSection.classList.remove('hidden');
    elements.authBtn.style.display = 'none';
    elements.profileBtn.style.display = 'inline-flex';
    elements.profileBtn.textContent = currentUser?.user_metadata?.name || 'Profile';
}

function showLoginForm() {
    elements.loginForm.classList.remove('hidden');
    elements.signupForm.classList.add('hidden');
}

function showSignupForm() {
    elements.loginForm.classList.add('hidden');
    elements.signupForm.classList.remove('hidden');
}

function switchSection(sectionName) {
    // Update navigation
    elements.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });
    
    // Update sections
    elements.sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === `${sectionName}-section`) {
            section.classList.add('active');
        }
    });
    
    currentSection = sectionName;
    
    // Load section-specific data
    switch (sectionName) {
        case 'progress':
            renderProgressChart();
            break;
        case 'leaderboard':
            loadLeaderboard(elements.leaderboardType.value);
            break;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    loadUserData();
    
    // Auth form switches
    elements.showSignup?.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupForm();
    });
    
    elements.showLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    // Auth buttons
    elements.loginBtn?.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        await signIn(email, password);
    });
    
    elements.signupBtn?.addEventListener('click', async () => {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const publicLeaderboard = document.getElementById('public-leaderboard').checked;
        
        if (!name || !email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        await signUp(email, password, name, publicLeaderboard);
    });
    
    elements.logoutBtn?.addEventListener('click', signOut);
    elements.profileBtn?.addEventListener('click', () => showModal('profile-modal'));
    
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchSection(item.dataset.section);
        });
    });
    
    // Add workout button
    document.getElementById('add-workout-btn')?.addEventListener('click', () => {
        resetWorkoutForm();
        showModal('workout-modal');
    });
    
    // Create team button
    document.getElementById('create-team-btn')?.addEventListener('click', () => {
        showModal('team-modal');
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Modal overlay clicks
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Workout form
    document.getElementById('workout-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const workoutData = {
            exercise_name: document.getElementById('exercise-name').value,
            weight: parseFloat(document.getElementById('weight').value) || 0,
            reps: parseInt(document.getElementById('reps').value),
            sets: parseInt(document.getElementById('sets').value),
            notes: document.getElementById('notes').value
        };
        
        if (!workoutData.exercise_name || !workoutData.reps || !workoutData.sets) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const workoutId = form.dataset.workoutId;
        if (workoutId) {
            await updateWorkout(workoutId, workoutData);
        } else {
            await addWorkout(workoutData);
        }
    });
    
    // Team form
    document.getElementById('team-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const teamData = {
            name: document.getElementById('team-name').value,
            description: document.getElementById('team-description').value
        };
        
        if (!teamData.name) {
            showToast('Please enter a team name', 'error');
            return;
        }
        
        await createTeam(teamData);
    });
    
    // Profile form
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('profile-name').value;
        const publicLeaderboard = document.getElementById('profile-public-leaderboard').checked;
        
        if (!name) {
            showToast('Please enter your name', 'error');
            return;
        }
        
        await updateUserProfile(name, publicLeaderboard);
    });
    
    // Chart controls
    elements.exerciseSelect?.addEventListener('change', renderProgressChart);
    elements.timeframeSelect?.addEventListener('change', renderProgressChart);
    
    // Leaderboard controls
    elements.leaderboardType?.addEventListener('change', (e) => {
        loadLeaderboard(e.target.value);
    });
    
    // Cancel buttons
    document.getElementById('cancel-workout')?.addEventListener('click', () => {
        closeModal('workout-modal');
        resetWorkoutForm();
    });
    
    document.getElementById('cancel-team')?.addEventListener('click', () => {
        closeModal('team-modal');
        resetTeamForm();
    });
    
    document.getElementById('cancel-profile')?.addEventListener('click', () => {
        closeModal('profile-modal');
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close any open modal
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
});

// Real-time subscriptions
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        await loadUserData();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        showAuthSection();
    }
});

// Initialize the app
console.log('RepTrack initialized successfully!');
