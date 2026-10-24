// admin.js - Controller for Administrator Dashboard

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const exportBtn = document.getElementById('export-csv-btn');
    const refreshBtn = document.getElementById('refresh-results-btn');
    const matrixSearch = document.getElementById('matrix-search');
    const notifyEl = document.getElementById('admin-notification');

    // Tab buttons & panes
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Tables
    const resultsTbody = document.querySelector('#results-table tbody');
    const teamsTbody = document.querySelector('#teams-table tbody');
    const judgesTbody = document.querySelector('#judges-table tbody');
    const criteriaTbody = document.querySelector('#criteria-table tbody');
    const auditTbody = document.querySelector('#audit-table tbody');

    // Modals
    const modalTeam = document.getElementById('modal-team');
    const modalJudge = document.getElementById('modal-judge');
    const modalCriterion = document.getElementById('modal-criterion');
    const modalReopen = document.getElementById('modal-reopen');

    // Modal Triggers
    const addTeamBtn = document.getElementById('add-team-btn');
    const addTeamOnSpotAdminBtn = document.getElementById('add-team-on-spot-admin-btn');
    const addJudgeBtn = document.getElementById('add-judge-btn');
    const addCriterionBtn = document.getElementById('add-criterion-btn');

    // Forms
    const formAddTeam = document.getElementById('form-add-team');
    const formAddJudge = document.getElementById('form-add-judge');
    const formAddCriterion = document.getElementById('form-add-criterion');

    let allResults = [];
    let pendingReopen = null;

    // Helper notification
    const notify = (msg, isError = false) => {
        notifyEl.textContent = msg;
        notifyEl.className = 'message ' + (isError ? 'error' : 'success');
        setTimeout(() => {
            notifyEl.textContent = '';
            notifyEl.className = 'message';
        }, 5000);
    };

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/';
        });
    }

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.add('hidden'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.tab);
            if (target) {
                target.classList.remove('hidden');
                target.classList.add('active');
            }

            // Lazy load tab data
            if (btn.dataset.tab === 'tab-teams') loadTeams();
            if (btn.dataset.tab === 'tab-judges') loadJudges();
            if (btn.dataset.tab === 'tab-criteria') loadCriteria();
            if (btn.dataset.tab === 'tab-audit') loadAudit();
        });
    });

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
        });
    });

    // ==================== 1. RESULTS & MATRIX ====================
    const statMatrixTotal = document.getElementById('stat-matrix-total');
    const statMatrixCompleted = document.getElementById('stat-matrix-completed');
    const statMatrixInProgress = document.getElementById('stat-matrix-in-progress');
    const statMatrixPending = document.getElementById('stat-matrix-pending');

    const updateMatrixStats = () => {
        if (!statMatrixTotal) return;
        statMatrixTotal.textContent = allResults.length;
        let completed = 0;
        let inProgress = 0;
        allResults.forEach(r => {
            if (r.completion_status === 'Complete') completed++;
            else if (r.completion_status === 'In Progress') inProgress++;
        });
        if (statMatrixCompleted) statMatrixCompleted.textContent = completed;
        if (statMatrixInProgress) statMatrixInProgress.textContent = inProgress;
        if (statMatrixPending) statMatrixPending.textContent = allResults.length - completed;
    };

    const loadResults = async (isSilent = false) => {
        try {
            const res = await fetch('/api/admin/results', { credentials: 'include' });
            if (!res.ok) {
                if (res.status === 401) { window.location.href = '/'; return; }
                throw new Error('Failed to load matrix');
            }
            allResults = await res.json();
            updateMatrixStats();
            renderResults();
        } catch (e) {
            if (!isSilent) {
                resultsTbody.innerHTML = `<tr><td colspan="8" class="error-cell">Error: ${e.message}</td></tr>`;
            }
        }
    };

    const renderResults = () => {
        const query = matrixSearch ? matrixSearch.value.toLowerCase().trim() : '';
        resultsTbody.innerHTML = '';

        let items = allResults;
        if (query) {
            items = items.filter(r =>
                (r.team_name || '').toLowerCase().includes(query) ||
                (r.team_code || '').toLowerCase().includes(query) ||
                (r.round_name || '').toLowerCase().includes(query)
            );
        }

        if (items.length === 0) {
            resultsTbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No matching results found</td></tr>';
            return;
        }

        items.forEach(row => {
            const tr = document.createElement('tr');
            const j1 = (row.judges && row.judges[0]) || {};
            const j2 = (row.judges && row.judges[1]) || {};

            const formatJudgeCell = (j) => {
                if (!j || j.total === null || j.total === undefined) {
                    return `<span class="text-muted">—</span>`;
                }
                const isSub = j.status === 'submitted' || j.status === 'locked';
                const bClass = isSub ? 'badge-submitted' : 'badge-draft';
                return `
                    <button class="btn btn-sm btn-outline view-scorecard-btn"
                            data-round-id="${row.round_id}"
                            data-team-id="${row.team_id}"
                            data-judge-id="${j.judge_id}"
                            data-judge-name="${j.judge_name}"
                            title="Click to view detailed criteria scorecard"
                            style="padding: 2px 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <strong>${j.total}</strong>
                        <span class="badge ${bClass}" style="font-size: 0.65rem; padding: 1px 4px;">${j.status}</span>
                    </button>
                `;
            };

            const j1Html = formatJudgeCell(j1);
            const j2Html = formatJudgeCell(j2);
            const avgText = row.average_total !== null && row.average_total !== undefined ? `<strong>${row.average_total}</strong> <small>/ ${row.max_marks || 100}</small>` : `<span class="text-muted">—</span>`;

            let badgeClass = 'badge-not-started';
            if (row.completion_status === 'Complete') badgeClass = 'badge-submitted';
            else if (row.completion_status === 'In Progress') badgeClass = 'badge-draft';

            let actionsHtml = '';
            row.judges.forEach(j => {
                if (j.total !== null && j.total !== undefined) {
                    actionsHtml += `
                        <button class="btn btn-sm btn-outline view-scorecard-btn"
                                data-round-id="${row.round_id}"
                                data-team-id="${row.team_id}"
                                data-judge-id="${j.judge_id}"
                                data-judge-name="${j.judge_name}"
                                style="margin-bottom: 2px; padding: 3px 7px; font-size: 0.78rem;">
                            🔍 View Scores
                        </button>
                    `;
                }
                if (j.status === 'submitted' || j.status === 'locked') {
                    actionsHtml += `
                        <button class="btn btn-sm btn-outline reopen-btn"
                                data-judge-id="${j.judge_id}"
                                data-judge-name="${j.judge_name}"
                                data-team-id="${row.team_id}"
                                data-team-name="${row.team_code} - ${row.team_name}"
                                data-round-id="${row.round_id}"
                                style="margin-bottom: 2px; padding: 3px 7px; font-size: 0.78rem;">
                            Unlock ${j.judge_code || 'Judge'}
                        </button>
                    `;
                }
            });

            tr.innerHTML = `
                <td><span class="round-tag">${row.round_name}</span></td>
                <td><strong class="team-code-tag">${row.team_code}</strong></td>
                <td><span class="team-name-label">${row.team_name}</span></td>
                <td>${j1Html}</td>
                <td>${j2Html}</td>
                <td>${avgText}</td>
                <td><span class="badge ${badgeClass}">${row.completion_status}</span></td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 0.35rem; justify-content: flex-end; flex-wrap: wrap;">
                        ${actionsHtml || '<span class="text-muted">—</span>'}
                    </div>
                </td>
            `;
            resultsTbody.appendChild(tr);
        });
    };

    // Scorecard Modal elements
    const modalScorecard = document.getElementById('modal-scorecard');
    const closeScorecardBtn = document.getElementById('close-scorecard-btn');
    const scorecardRoundBadge = document.getElementById('scorecard-round-badge');
    const scorecardTeamTitle = document.getElementById('scorecard-team-title');
    const scorecardJudgeInfo = document.getElementById('scorecard-judge-info');
    const scorecardTotalMarks = document.getElementById('scorecard-total-marks');
    const scorecardStatusBadge = document.getElementById('scorecard-status-badge');
    const scorecardCriteriaTbody = document.getElementById('scorecard-criteria-tbody');
    const scorecardTimestamps = document.getElementById('scorecard-timestamps');
    const scorecardActionExtra = document.getElementById('scorecard-action-extra');

    if (closeScorecardBtn && modalScorecard) {
        closeScorecardBtn.addEventListener('click', () => modalScorecard.classList.add('hidden'));
        modalScorecard.addEventListener('click', (e) => {
            if (e.target === modalScorecard) modalScorecard.classList.add('hidden');
        });
    }

    const openScorecard = async (roundId, teamId, judgeId, judgeName) => {
        if (!modalScorecard) return;
        modalScorecard.classList.remove('hidden');
        scorecardCriteriaTbody.innerHTML = '<tr><td colspan="3" class="loading-cell">Loading detailed criteria scorecard...</td></tr>';
        scorecardActionExtra.innerHTML = '';

        try {
            const res = await fetch(`/api/evaluations/${roundId}/${teamId}?judge_id=${judgeId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load evaluation details');
            const data = await res.json();
            const ev = data.evaluation || {};
            const crits = data.criteria || [];
            const part = data.participant || {};
            const rnd = data.round || {};

            scorecardRoundBadge.textContent = rnd.name || roundId;
            scorecardTeamTitle.textContent = `${part.team_code || ''} – ${part.team_name || ''}`;
            scorecardJudgeInfo.textContent = `Evaluator: ${judgeName || 'Judge'}`;

            const scoresMap = {};
            let totalGiven = 0;
            (ev.scores || []).forEach(s => {
                scoresMap[s.criterion_id] = s;
                if (s.marks !== null && s.marks !== undefined) totalGiven += Number(s.marks);
            });

            const maxRound = crits.reduce((acc, c) => acc + (c.max_marks || 20), 0) || 100;
            scorecardTotalMarks.innerHTML = `${totalGiven} <span style="font-size: 1rem; color: var(--color-muted-grey); font-weight: 400;">/ ${maxRound}</span>`;

            const isSub = ev.status === 'submitted' || ev.status === 'locked';
            scorecardStatusBadge.textContent = isSub ? 'Submitted & Locked' : (ev.status === 'draft' ? 'Draft Saved' : 'Not Started');
            scorecardStatusBadge.className = `badge ${isSub ? 'badge-submitted' : (ev.status === 'draft' ? 'badge-draft' : 'badge-not-started')}`;

            const subTime = ev.submitted_at ? new Date(ev.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'None';
            const lockTime = ev.locked_at ? new Date(ev.locked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'None';
            scorecardTimestamps.textContent = `Submitted: ${subTime} | Locked: ${lockTime}`;

            // Render criteria table
            scorecardCriteriaTbody.innerHTML = '';
            crits.forEach((c, idx) => {
                const s = scoresMap[c.id] || {};
                const marksVal = s.marks !== null && s.marks !== undefined ? s.marks : '—';
                const pct = s.marks !== null && s.marks !== undefined ? Math.min(100, Math.round((s.marks / (c.max_marks || 20)) * 100)) : 0;
                const remarksText = s.remarks ? `<div style="font-size: 0.78rem; color: var(--color-muted-grey); margin-top: 3px;"><em>"${s.remarks}"</em></div>` : '';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight: 600;">${idx + 1}. ${c.name}</div>
                        <div style="font-size: 0.76rem; color: var(--color-muted-grey);">${c.description || ''}</div>
                        ${remarksText}
                    </td>
                    <td style="text-align: center; font-weight: 500;">${c.max_marks || 20}</td>
                    <td style="text-align: right;">
                        <span style="font-size: 1.05rem; font-weight: 700; color: var(--color-black);">${marksVal}</span>
                        <div style="width: 100%; background: #e2e8f0; height: 4px; margin-top: 4px;">
                            <div style="width: ${pct}%; background: var(--color-black); height: 100%;"></div>
                        </div>
                    </td>
                `;
                scorecardCriteriaTbody.appendChild(tr);
            });

            // Action button inside scorecard: unlock if submitted
            if (isSub) {
                const unlockBtn = document.createElement('button');
                unlockBtn.className = 'btn btn-outline btn-sm';
                unlockBtn.textContent = 'Unlock Evaluation for Editing';
                unlockBtn.addEventListener('click', () => {
                    modalScorecard.classList.add('hidden');
                    pendingReopen = { judge_id: judgeId, team_id: teamId, round_id: roundId };
                    document.getElementById('reopen-judge-name').textContent = judgeName;
                    document.getElementById('reopen-team-name').textContent = `${part.team_code} – ${part.team_name}`;
                    modalReopen.classList.remove('hidden');
                });
                scorecardActionExtra.appendChild(unlockBtn);
            }
        } catch (err) {
            scorecardCriteriaTbody.innerHTML = `<tr><td colspan="3" class="error-cell">${err.message}</td></tr>`;
        }
    };

    // Table clicks: handle view scorecard & reopen
    resultsTbody.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-scorecard-btn');
        if (viewBtn) {
            openScorecard(viewBtn.dataset.roundId, viewBtn.dataset.teamId, viewBtn.dataset.judgeId, viewBtn.dataset.judgeName);
            return;
        }

        const btn = e.target.closest('.reopen-btn');
        if (!btn) return;
        pendingReopen = {
            judge_id: btn.dataset.judgeId,
            team_id: btn.dataset.teamId,
            round_id: btn.dataset.roundId
        };
        document.getElementById('reopen-judge-name').textContent = btn.dataset.judgeName;
        document.getElementById('reopen-team-name').textContent = btn.dataset.teamName;
        modalReopen.classList.remove('hidden');
    });

    // Confirm Reopen
    document.getElementById('confirm-reopen-btn').addEventListener('click', async () => {
        if (!pendingReopen) return;
        const eraseCheckbox = document.getElementById('reopen-erase-marks-checkbox');
        const eraseMarks = eraseCheckbox ? eraseCheckbox.checked : false;
        const btn = document.getElementById('confirm-reopen-btn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            const res = await fetch('/api/admin/reopen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    judge_id: pendingReopen.judge_id,
                    participant_id: pendingReopen.team_id,
                    round_id: pendingReopen.round_id,
                    erase_scores: eraseMarks
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reopen');

            modalReopen.classList.add('hidden');
            if (eraseCheckbox) eraseCheckbox.checked = false;
            notify(data.message || (eraseMarks ? 'Evaluation marks erased! Judge can now score this team from scratch.' : 'Evaluation unlocked successfully! Judge can now modify marks.'));
            await loadResults();
        } catch (err) {
            notify(err.message, true);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Confirm & Reopen';
        }
    });

    // ==================== CSV EXPORT ====================
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            exportBtn.disabled = true;
            exportBtn.textContent = 'Generating CSV...';
            try {
                const res = await fetch('/api/admin/export', { credentials: 'include' });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `jury_scoring_results_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                notify('CSV Export downloaded successfully!');
            } catch (err) {
                notify(err.message, true);
            } finally {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<span class="btn-icon">⬇</span> Download Results CSV';
            }
        });
    }

    // ==================== 2. TEAMS MANAGEMENT ====================
    const loadTeams = async () => {
        try {
            const res = await fetch('/api/admin/participants', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load teams');
            const teams = await res.json();
            teamsTbody.innerHTML = '';
            if (teams.length === 0) {
                teamsTbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No teams registered</td></tr>';
                return;
            }
            teams.forEach(t => {
                const tr = document.createElement('tr');
                const activeBadge = t.is_active ? '<span class="badge badge-submitted">Active</span>' : '<span class="badge badge-not-started">Inactive</span>';
                tr.innerHTML = `
                    <td><strong>${t.team_code}</strong></td>
                    <td>${t.team_name}</td>
                    <td>${activeBadge}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-sm btn-outline toggle-team-btn" data-id="${t.id}" data-active="${t.is_active ? 0 : 1}">
                            ${t.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                `;
                teamsTbody.appendChild(tr);
            });
        } catch (e) {
            teamsTbody.innerHTML = `<tr><td colspan="4" class="error-cell">${e.message}</td></tr>`;
        }
    };

    const openAddTeam = async () => {
        modalTeam.classList.remove('hidden');
        const codeInput = document.getElementById('new-team-code');
        const nameInput = document.getElementById('new-team-name');
        nameInput.value = '';
        codeInput.value = '';
        codeInput.placeholder = 'Fetching next code...';
        nameInput.focus();
        try {
            const res = await fetch('/api/teams/next-code', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.next_code) {
                    codeInput.placeholder = `e.g. ${data.next_code} (auto-assigned if blank)`;
                }
            }
        } catch (e) {
            codeInput.placeholder = 'e.g. TEAM-33 (auto-assigned)';
        }
    };

    if (addTeamBtn) {
        addTeamBtn.addEventListener('click', openAddTeam);
    }
    if (addTeamOnSpotAdminBtn) {
        addTeamOnSpotAdminBtn.addEventListener('click', openAddTeam);
    }

    formAddTeam.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('new-team-code').value.trim();
        const name = document.getElementById('new-team-name').value.trim();
        if (!name) {
            notify('Team name is required', true);
            return;
        }
        try {
            const res = await fetch('/api/admin/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ team_code: code, team_name: name })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create team');
            modalTeam.classList.add('hidden');
            formAddTeam.reset();
            const createdCode = (data.team && data.team.team_code) || code || 'New';
            notify(`Team ${createdCode} created successfully!`);
            loadTeams();
            loadResults();
        } catch (err) {
            notify(err.message, true);
        }
    });

    teamsTbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.toggle-team-btn');
        if (!btn) return;
        const id = btn.dataset.id;
        const newActive = parseInt(btn.dataset.active);
        try {
            const res = await fetch(`/api/admin/participants/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: newActive })
            });
            if (!res.ok) throw new Error('Failed to update status');
            loadTeams();
            loadResults();
        } catch (err) {
            notify(err.message, true);
        }
    });

    // ==================== 3. JUDGES MANAGEMENT ====================
    const loadJudges = async () => {
        try {
            const res = await fetch('/api/admin/judges', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load judges');
            const judges = await res.json();
            judgesTbody.innerHTML = '';
            if (judges.length === 0) {
                judgesTbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No judges registered</td></tr>';
                return;
            }
            judges.forEach(j => {
                const tr = document.createElement('tr');
                const roleBadge = j.role === 'admin' ? '<span class="badge badge-draft">Admin</span>' : '<span class="badge badge-submitted">Judge</span>';
                const activeBadge = j.is_active ? '<span class="badge badge-submitted">Active</span>' : '<span class="badge badge-not-started">Inactive</span>';
                tr.innerHTML = `
                    <td><strong>${j.email}</strong></td>
                    <td>${j.display_name}</td>
                    <td>${roleBadge}</td>
                    <td>${activeBadge}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-sm btn-outline toggle-judge-btn" data-id="${j.id}" data-active="${j.is_active ? 0 : 1}">
                            ${j.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                `;
                judgesTbody.appendChild(tr);
            });
        } catch (e) {
            judgesTbody.innerHTML = `<tr><td colspan="5" class="error-cell">${e.message}</td></tr>`;
        }
    };

    if (addJudgeBtn) {
        addJudgeBtn.addEventListener('click', () => {
            modalJudge.classList.remove('hidden');
        });
    }

    formAddJudge.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('new-judge-user').value.trim();
        const display_name = document.getElementById('new-judge-name').value.trim();
        const role = document.getElementById('new-judge-role').value;
        const password = document.getElementById('new-judge-pw').value;
        try {
            const res = await fetch('/api/admin/judges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, display_name, role, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create judge');
            modalJudge.classList.add('hidden');
            formAddJudge.reset();
            notify(`Judge ${display_name} created successfully!`);
            loadJudges();
            loadResults();
        } catch (err) {
            notify(err.message, true);
        }
    });

    judgesTbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.toggle-judge-btn');
        if (!btn) return;
        const id = btn.dataset.id;
        const newActive = parseInt(btn.dataset.active);
        try {
            const res = await fetch(`/api/admin/judges/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: newActive })
            });
            if (!res.ok) throw new Error('Failed to update status');
            loadJudges();
            loadResults();
        } catch (err) {
            notify(err.message, true);
        }
    });

    // ==================== 4. CRITERIA MANAGEMENT ====================
    const loadCriteria = async () => {
        try {
            const [critRes, roundRes] = await Promise.all([
                fetch('/api/admin/criteria', { credentials: 'include' }),
                fetch('/api/admin/rounds', { credentials: 'include' })
            ]);
            const criteria = await critRes.json();
            const rounds = await roundRes.json();
            const roundMap = {};
            rounds.forEach(r => roundMap[r.id] = r.name);

            criteriaTbody.innerHTML = '';
            if (criteria.length === 0) {
                criteriaTbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No criteria defined</td></tr>';
                return;
            }
            criteria.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><span class="round-tag">${roundMap[c.round_id] || c.round_id}</span></td>
                    <td>#${c.display_order}</td>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.max_marks} marks</td>
                    <td>${c.weight}x</td>
                    <td><small class="text-muted">${c.description || '—'}</small></td>
                    <td style="text-align: right;">
                        <button class="btn btn-sm btn-outline edit-crit-btn" data-id="${c.id}" data-max="${c.max_marks}" data-name="${c.name}">
                            Edit Max
                        </button>
                    </td>
                `;
                criteriaTbody.appendChild(tr);
            });
        } catch (e) {
            criteriaTbody.innerHTML = `<tr><td colspan="7" class="error-cell">${e.message}</td></tr>`;
        }
    };

    if (addCriterionBtn) {
        addCriterionBtn.addEventListener('click', () => {
            modalCriterion.classList.remove('hidden');
        });
    }

    formAddCriterion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const round_id = document.getElementById('crit-round').value;
        const name = document.getElementById('crit-name').value.trim();
        const description = document.getElementById('crit-desc').value.trim();
        const max_marks = parseInt(document.getElementById('crit-max').value);
        const weight = parseFloat(document.getElementById('crit-weight').value);
        try {
            const res = await fetch('/api/admin/criteria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ round_id, name, description, max_marks, weight })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add criterion');
            modalCriterion.classList.add('hidden');
            formAddCriterion.reset();
            notify(`Criterion "${name}" added successfully!`);
            loadCriteria();
        } catch (err) {
            notify(err.message, true);
        }
    });

    criteriaTbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.edit-crit-btn');
        if (!btn) return;
        const cid = btn.dataset.id;
        const cName = btn.dataset.name;
        const currentMax = btn.dataset.max;
        const newMax = prompt(`Enter new maximum marks for "${cName}":`, currentMax);
        if (newMax !== null && newMax.trim() !== '') {
            const num = parseInt(newMax);
            if (isNaN(num) || num <= 0) {
                alert('Please enter a valid positive number');
                return;
            }
            try {
                const res = await fetch(`/api/admin/criteria/${cid}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ max_marks: num })
                });
                if (!res.ok) throw new Error('Failed to update criterion');
                notify(`Maximum marks updated to ${num}`);
                loadCriteria();
                loadResults();
            } catch (err) {
                notify(err.message, true);
            }
        }
    });

    // ==================== 5. AUDIT LOGS ====================
    const loadAudit = async () => {
        try {
            const res = await fetch('/api/admin/audit', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load audit logs');
            const logs = await res.json();
            auditTbody.innerHTML = '';
            if (logs.length === 0) {
                auditTbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No audit entries recorded yet</td></tr>';
                return;
            }
            logs.forEach(l => {
                const tr = document.createElement('tr');
                const timeStr = l.created_at ? new Date(l.created_at).toLocaleString() : '—';
                tr.innerHTML = `
                    <td><small>${timeStr}</small></td>
                    <td><code>${l.actor_id || 'System'}</code></td>
                    <td><span class="badge badge-submitted">${l.action}</span></td>
                    <td><code>${l.entity_type}:${l.entity_id}</code></td>
                `;
                auditTbody.appendChild(tr);
            });
        } catch (e) {
            auditTbody.innerHTML = `<tr><td colspan="4" class="error-cell">${e.message}</td></tr>`;
        }
    };

    // ==================== 6. RESET ALL EVALUATION DATA ====================
    const openResetAllBtn = document.getElementById('open-reset-all-btn');
    const modalResetAll = document.getElementById('modal-reset-all');
    const cancelResetModalBtn = document.getElementById('cancel-reset-modal-btn');
    const confirmResetAllBtn = document.getElementById('confirm-reset-all-btn');
    const resetTeamsRosterCheckbox = document.getElementById('reset-teams-roster-checkbox');
    const resetModalMsg = document.getElementById('reset-modal-msg');

    if (openResetAllBtn && modalResetAll) {
        openResetAllBtn.addEventListener('click', () => {
            modalResetAll.classList.remove('hidden');
            if (resetModalMsg) { resetModalMsg.style.display = 'none'; resetModalMsg.textContent = ''; }
            if (resetTeamsRosterCheckbox) { resetTeamsRosterCheckbox.checked = false; }
        });

        if (cancelResetModalBtn) {
            cancelResetModalBtn.addEventListener('click', () => {
                modalResetAll.classList.add('hidden');
            });
        }

        modalResetAll.addEventListener('click', (e) => {
            if (e.target === modalResetAll) {
                modalResetAll.classList.add('hidden');
            }
        });

        if (confirmResetAllBtn) {
            confirmResetAllBtn.addEventListener('click', async () => {
                confirmResetAllBtn.disabled = true;
                confirmResetAllBtn.textContent = 'Erasing Data...';
                const resetTeams = resetTeamsRosterCheckbox ? resetTeamsRosterCheckbox.checked : false;

                try {
                    const res = await fetch('/api/admin/reset-all', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ reset_teams: resetTeams })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to reset evaluations');

                    if (resetModalMsg) {
                        resetModalMsg.textContent = data.message || 'All evaluation data reset successfully!';
                        resetModalMsg.className = 'message success';
                        resetModalMsg.style.display = 'block';
                    }

                    notify(data.message || 'All evaluations erased! Judges dashboard reset to zero.');
                    
                    // Reload all active sections
                    await loadResults();
                    await loadTeams();
                    await loadAudit();

                    setTimeout(() => {
                        modalResetAll.classList.add('hidden');
                        confirmResetAllBtn.disabled = false;
                        confirmResetAllBtn.textContent = 'Yes, Erase & Reset All';
                        if (resetModalMsg) { resetModalMsg.style.display = 'none'; }
                    }, 900);
                } catch (err) {
                    if (resetModalMsg) {
                        resetModalMsg.textContent = err.message;
                        resetModalMsg.className = 'message error';
                        resetModalMsg.style.display = 'block';
                    }
                    confirmResetAllBtn.disabled = false;
                    confirmResetAllBtn.textContent = 'Yes, Erase & Reset All';
                }
            });
        }
    }

    // Live Auto-Refresh: auto-poll for new judge submissions every 3.5 seconds
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            const resultsTab = document.getElementById('tab-results');
            if (resultsTab && !resultsTab.classList.contains('hidden')) {
                loadResults(true); // silent update without error flashing
            }
        }
    }, 3500);

    // Initial load
    loadResults();
});
