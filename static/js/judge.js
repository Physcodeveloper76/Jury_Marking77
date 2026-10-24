// judge.js - Judge dashboard interactions

document.addEventListener('DOMContentLoaded', () => {
    const roundSelect = document.getElementById('round-select');
    const teamSearch = document.getElementById('team-search');
    const evalTableBody = document.querySelector('#eval-table tbody');
    const logoutBtn = document.getElementById('logout-btn');

    const statTotalTeams = document.getElementById('stat-total-teams');
    const statCompleted = document.getElementById('stat-completed');
    const statInProgress = document.getElementById('stat-in-progress');

    let allRounds = [];
    let allParticipants = [];
    let allEvaluations = [];

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/';
        });
    }

    // Load dashboard data
    const loadDashboard = async () => {
        try {
            const res = await fetch('/api/judge/dashboard', { credentials: 'include' });
            if (!res.ok) {
                if (res.status === 401) { window.location.href = '/'; return; }
                throw new Error('Failed to load dashboard');
            }
            const data = await res.json();
            allRounds = data.rounds || [];
            allParticipants = data.participants || [];
            allEvaluations = data.evaluations || [];

            populateRounds(allRounds);
            updateStats();
            renderTable();
        } catch (e) {
            evalTableBody.innerHTML = `<tr><td colspan="5" class="error-cell">Could not load evaluations. <button class="btn btn-sm" onclick="location.reload()">Retry</button></td></tr>`;
            console.error(e);
        }
    };

    const populateRounds = (rounds) => {
        roundSelect.innerHTML = '<option value="">All Rounds</option>';
        rounds.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = r.name;
            roundSelect.appendChild(opt);
        });
    };

    const updateStats = () => {
        statTotalTeams.textContent = allParticipants.length;
        let completedCount = 0;
        let inProgressCount = 0;

        allEvaluations.forEach(ev => {
            if (ev.status === 'submitted' || ev.status === 'locked') {
                completedCount++;
            } else if (ev.status === 'draft') {
                inProgressCount++;
            }
        });

        statCompleted.textContent = completedCount;
        statInProgress.textContent = inProgressCount;
    };

    const renderTable = () => {
        const selectedRound = roundSelect.value;
        const searchTerm = teamSearch.value.toLowerCase().trim();
        evalTableBody.innerHTML = '';

        let items = allEvaluations;

        // Filter by round
        if (selectedRound) {
            items = items.filter(e => e.round_id === selectedRound);
        }

        // Filter by team search
        if (searchTerm) {
            items = items.filter(e =>
                (e.team_name || '').toLowerCase().includes(searchTerm) ||
                (e.team_code || '').toLowerCase().includes(searchTerm)
            );
        }

        if (items.length === 0) {
            evalTableBody.innerHTML = '<tr><td colspan="5" class="empty-cell">No matching evaluations found</td></tr>';
            return;
        }

        items.forEach(ev => {
            const status = ev.status || 'not started';
            let badgeClass = 'badge-not-started';
            let badgeText = 'Not Started';
            let actionText = 'Evaluate';
            let btnClass = 'btn-primary';

            if (status === 'submitted' || status === 'locked') {
                badgeClass = 'badge-submitted';
                badgeText = 'Submitted & Locked';
                actionText = 'View Submission';
                btnClass = 'btn-outline';
            } else if (status === 'draft') {
                badgeClass = 'badge-draft';
                badgeText = 'Draft Saved';
                actionText = 'Continue Draft';
                btnClass = 'btn-secondary';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="round-tag">${ev.round_name || 'Round'}</span></td>
                <td><strong class="team-code-tag">${ev.team_code || '—'}</strong></td>
                <td><span class="team-name-label">${ev.team_name || 'Team'}</span></td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td style="text-align: right;">
                    <a href="/scoring/${ev.round_id}/${ev.team_id}" class="btn btn-sm ${btnClass} action-btn">
                        ${actionText}
                    </a>
                </td>
            `;
            evalTableBody.appendChild(row);
        });
    };

    roundSelect.addEventListener('change', renderTable);
    teamSearch.addEventListener('input', renderTable);

    loadDashboard();
});
