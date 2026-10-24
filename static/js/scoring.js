// scoring.js - Logic for the evaluation scoring screen
// Strictly adheres to WEB FORGE AI Jury Scoring Portal architecture

document.addEventListener('DOMContentLoaded', () => {
    const roundId = window.ROUND_ID;
    const teamId = window.TEAM_ID;

    const roundBadge = document.getElementById('round-badge');
    const teamHeading = document.getElementById('team-heading');
    const teamSubtext = document.getElementById('team-subtext');
    const liveTotalEl = document.getElementById('live-total');
    const liveMaxEl = document.getElementById('live-max');
    const statusTag = document.getElementById('status-tag');
    const lockedBanner = document.getElementById('locked-banner');
    const criteriaList = document.getElementById('criteria-list');
    const saveStatus = document.getElementById('save-status');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const submitFinalBtn = document.getElementById('submit-final-btn');
    const scoringMsg = document.getElementById('scoring-msg');
    const logoutBtn = document.getElementById('logout-btn');

    // Modal elements
    const confirmModal = document.getElementById('confirm-modal');
    const modalTeamName = document.getElementById('modal-team-name');
    const modalTotalScore = document.getElementById('modal-total-score');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    let criteriaData = [];
    let isLocked = false;
    let hasUnsavedChanges = false;
    let totalMaxMarks = 0;

    // Warn on unload if unsaved changes exist
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges && !isLocked) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Helper message
    const showMsg = (text, isErr = false) => {
        scoringMsg.textContent = text;
        scoringMsg.className = 'message ' + (isErr ? 'error' : 'success');
        if (!isErr) {
            setTimeout(() => { scoringMsg.textContent = ''; scoringMsg.className = 'message'; }, 4000);
        }
    };

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/';
        });
    }

    // Load evaluation data
    const loadEvaluation = async () => {
        try {
            const resp = await fetch(`/api/evaluations/${roundId}/${teamId}`, { credentials: 'include' });
            if (!resp.ok) {
                if (resp.status === 401) { window.location.href = '/'; return; }
                throw new Error('Failed to load evaluation data');
            }
            const data = await resp.json();

            // Populate header
            const p = data.participant || {};
            const r = data.round || {};
            roundBadge.textContent = r.name || 'Evaluation Round';
            teamHeading.textContent = `${p.team_code || ''} — ${p.team_name || 'Team'}`;
            teamSubtext.textContent = `Score all ${data.criteria.length} criteria carefully. Final submission locks your evaluation.`;

            criteriaData = data.criteria || [];
            totalMaxMarks = criteriaData.reduce((acc, c) => acc + (c.max_marks || 20), 0);
            liveMaxEl.textContent = `/ ${totalMaxMarks}`;

            const ev = data.evaluation || {};
            const st = ev.status || 'not started';
            isLocked = (st === 'submitted' || st === 'locked');

            if (isLocked) {
                statusTag.textContent = 'Status: Submitted & Locked';
                statusTag.className = 'score-status-tag tag-locked';
                lockedBanner.classList.remove('hidden');
                saveDraftBtn.disabled = true;
                submitFinalBtn.disabled = true;
                saveDraftBtn.classList.add('disabled');
                submitFinalBtn.classList.add('disabled');
            } else {
                lockedBanner.classList.add('hidden');
                saveDraftBtn.disabled = false;
                submitFinalBtn.disabled = false;
                saveDraftBtn.classList.remove('disabled');
                submitFinalBtn.classList.remove('disabled');
                if (st === 'draft') {
                    statusTag.textContent = 'Status: Draft Saved';
                    statusTag.className = 'score-status-tag tag-draft';
                } else {
                    statusTag.textContent = 'Status: Not Started';
                    statusTag.className = 'score-status-tag tag-not-started';
                }
            }

            renderCriteria(criteriaData, ev.scores || []);
            calculateLiveTotal();
            saveStatus.textContent = isLocked ? 'Evaluation is locked' : 'All changes saved';
            hasUnsavedChanges = false;
        } catch (err) {
            console.error(err);
            criteriaList.innerHTML = `<div class="error-state">Error: ${err.message}. <button class="btn btn-sm" onclick="location.reload()">Retry</button></div>`;
        }
    };

    // Render criteria cards
    const renderCriteria = (criteria, existingScores) => {
        const scoreLookup = {};
        existingScores.forEach(s => {
            scoreLookup[s.criterion_id] = s;
        });

        criteriaList.innerHTML = '';
        criteria.forEach((crit, index) => {
            const sc = scoreLookup[crit.id] || {};
            const card = document.createElement('div');
            card.className = 'criterion-card';
            card.dataset.criterionId = crit.id;

            const existingMark = (sc.marks !== null && sc.marks !== undefined) ? sc.marks : '';
            const existingRemarks = sc.remarks || '';

            card.innerHTML = `
                <div class="criterion-header">
                    <div class="criterion-title-wrap">
                        <span class="criterion-number">#${index + 1}</span>
                        <h3 class="criterion-name">${crit.name}</h3>
                    </div>
                    <span class="criterion-max-badge">Max: ${crit.max_marks} marks</span>
                </div>
                <p class="criterion-desc">${crit.description || 'Evaluate according to round standards.'}</p>
                <div class="criterion-inputs">
                    <div class="field mark-field">
                        <label for="mark-${crit.id}">Marks Awarded (0 – ${crit.max_marks})</label>
                        <input
                            type="number"
                            id="mark-${crit.id}"
                            class="criterion-mark-input"
                            data-crit-id="${crit.id}"
                            data-max="${crit.max_marks}"
                            min="0"
                            max="${crit.max_marks}"
                            step="0.5"
                            placeholder="0 – ${crit.max_marks}"
                            value="${existingMark}"
                            ${isLocked ? 'disabled readonly' : ''}
                        />
                        <span class="field-error" id="err-${crit.id}"></span>
                    </div>
                    <div class="field remarks-field">
                        <label for="remarks-${crit.id}">Remarks / Justification (optional)</label>
                        <textarea
                            id="remarks-${crit.id}"
                            class="criterion-remarks-input"
                            data-crit-id="${crit.id}"
                            rows="2"
                            placeholder="Observations or feedback for this criterion..."
                            ${isLocked ? 'disabled readonly' : ''}
                        >${existingRemarks}</textarea>
                    </div>
                </div>
            `;
            criteriaList.appendChild(card);
        });

        // Add event listeners on inputs
        if (!isLocked) {
            const markInputs = criteriaList.querySelectorAll('.criterion-mark-input');
            markInputs.forEach(input => {
                input.addEventListener('input', () => {
                    hasUnsavedChanges = true;
                    saveStatus.textContent = 'Unsaved changes';
                    saveStatus.classList.add('has-unsaved');
                    validateInput(input);
                    calculateLiveTotal();
                });
            });

            const remarksInputs = criteriaList.querySelectorAll('.criterion-remarks-input');
            remarksInputs.forEach(input => {
                input.addEventListener('input', () => {
                    hasUnsavedChanges = true;
                    saveStatus.textContent = 'Unsaved changes';
                    saveStatus.classList.add('has-unsaved');
                });
            });
        }
    };

    // Validate a single input
    const validateInput = (input) => {
        const val = input.value.trim();
        const max = parseFloat(input.dataset.max);
        const errEl = document.getElementById(`err-${input.dataset.critId}`);

        if (val === '') {
            errEl.textContent = '';
            input.classList.remove('input-error');
            return true;
        }

        const num = parseFloat(val);
        if (isNaN(num)) {
            errEl.textContent = 'Must be a valid number';
            input.classList.add('input-error');
            return false;
        }
        if (num < 0) {
            errEl.textContent = 'Marks cannot be negative';
            input.classList.add('input-error');
            return false;
        }
        if (num > max) {
            errEl.textContent = `Cannot exceed maximum (${max})`;
            input.classList.add('input-error');
            return false;
        }

        errEl.textContent = '';
        input.classList.remove('input-error');
        return true;
    };

    // Calculate live total score
    const calculateLiveTotal = () => {
        let sum = 0;
        const markInputs = criteriaList.querySelectorAll('.criterion-mark-input');
        markInputs.forEach(input => {
            const v = parseFloat(input.value);
            if (!isNaN(v) && v >= 0) {
                sum += v;
            }
        });
        const rounded = Math.round(sum * 100) / 100;
        liveTotalEl.textContent = rounded;
        if (modalTotalScore) {
            modalTotalScore.textContent = `${rounded} / ${totalMaxMarks}`;
        }
        return rounded;
    };

    // Collect scores payload
    const getScoresPayload = () => {
        const scores = [];
        const markInputs = criteriaList.querySelectorAll('.criterion-mark-input');
        markInputs.forEach(input => {
            const cid = input.dataset.critId;
            const remarksInput = document.getElementById(`remarks-${cid}`);
            const val = input.value.trim();
            scores.push({
                criterion_id: cid,
                marks: val === '' ? null : parseFloat(val),
                remarks: remarksInput ? remarksInput.value.trim() : ''
            });
        });
        return scores;
    };

    // Save Draft
    saveDraftBtn.addEventListener('click', async () => {
        if (isLocked) return;
        saveDraftBtn.disabled = true;
        saveDraftBtn.textContent = 'Saving...';

        const payload = {
            round_id: roundId,
            participant_id: teamId,
            scores: getScoresPayload()
        };

        try {
            const res = await fetch('/api/evaluations/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save draft');

            showMsg('Draft saved successfully!');
            hasUnsavedChanges = false;
            saveStatus.textContent = 'All changes saved (Draft)';
            saveStatus.classList.remove('has-unsaved');
            statusTag.textContent = 'Status: Draft Saved';
            statusTag.className = 'score-status-tag tag-draft';
        } catch (e) {
            showMsg(e.message, true);
        } finally {
            saveDraftBtn.disabled = false;
            saveDraftBtn.textContent = 'Save Draft';
        }
    });

    // Open Submit Confirmation Modal
    submitFinalBtn.addEventListener('click', () => {
        if (isLocked) return;

        // Validate all criteria are filled and within bounds
        let hasError = false;
        let missingCritName = null;
        const markInputs = criteriaList.querySelectorAll('.criterion-mark-input');

        markInputs.forEach(input => {
            const cid = input.dataset.critId;
            const val = input.value.trim();
            const max = parseFloat(input.dataset.max);
            const crit = criteriaData.find(c => c.id === cid);
            const critName = crit ? crit.name : 'Criterion';

            if (val === '') {
                hasError = true;
                if (!missingCritName) missingCritName = critName;
                input.classList.add('input-error');
                const errEl = document.getElementById(`err-${cid}`);
                if (errEl) errEl.textContent = 'Score is required for submission';
            } else {
                const num = parseFloat(val);
                if (isNaN(num) || num < 0 || num > max) {
                    hasError = true;
                    if (!missingCritName) missingCritName = critName;
                    validateInput(input);
                }
            }
        });

        if (hasError) {
            showMsg(`Please enter valid marks for all criteria (missing or invalid: "${missingCritName}").`, true);
            return;
        }

        modalTeamName.textContent = teamHeading.textContent;
        calculateLiveTotal();
        confirmModal.classList.remove('hidden');
    });

    // Cancel modal
    modalCancelBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    // Confirm Submit
    modalConfirmBtn.addEventListener('click', async () => {
        modalConfirmBtn.disabled = true;
        modalConfirmBtn.textContent = 'Submitting & Locking...';

        const payload = {
            round_id: roundId,
            participant_id: teamId,
            scores: getScoresPayload()
        };

        try {
            const res = await fetch('/api/evaluations/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit evaluation');

            confirmModal.classList.add('hidden');
            hasUnsavedChanges = false;
            isLocked = true;
            statusTag.textContent = 'Status: Submitted & Locked';
            statusTag.className = 'score-status-tag tag-locked';
            lockedBanner.classList.remove('hidden');

            // Disable all fields
            const allInputs = criteriaList.querySelectorAll('input, textarea');
            allInputs.forEach(i => i.disabled = true);
            saveDraftBtn.disabled = true;
            submitFinalBtn.disabled = true;
            saveDraftBtn.classList.add('disabled');
            submitFinalBtn.classList.add('disabled');

            showMsg('Evaluation submitted and locked successfully! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = '/judge';
            }, 1800);
        } catch (e) {
            showMsg(e.message, true);
            modalConfirmBtn.disabled = false;
            modalConfirmBtn.textContent = 'Yes, Submit & Lock';
        }
    });

    loadEvaluation();

    // Auto-detect when admin reopens or resets this evaluation while page is open
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !hasUnsavedChanges) {
            loadEvaluation();
        }
    });

    setInterval(() => {
        if (document.visibilityState === 'visible' && isLocked && !hasUnsavedChanges) {
            fetch(`/api/evaluations/${roundId}/${teamId}`, { credentials: 'include' })
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data && data.evaluation) {
                        const stNow = data.evaluation.status || 'not started';
                        if (stNow !== 'submitted' && stNow !== 'locked') {
                            loadEvaluation();
                        }
                    }
                })
                .catch(() => {});
        }
    }, 3500);
});
