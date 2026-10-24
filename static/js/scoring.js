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
            const hasExisting = (st === 'submitted' || st === 'locked');

            if (hasExisting) {
                statusTag.textContent = 'Status: Final Submitted';
                statusTag.className = 'score-status-tag tag-locked';
                if (submitFinalBtn) submitFinalBtn.innerHTML = '<span>✓</span> Update Final Marks';
                if (lockedBanner) lockedBanner.classList.add('hidden');
            } else {
                statusTag.textContent = 'Status: Not Started';
                statusTag.className = 'score-status-tag tag-not-started';
                if (submitFinalBtn) submitFinalBtn.innerHTML = '<span>✓</span> Submit Final Marks';
                if (lockedBanner) lockedBanner.classList.add('hidden');
            }

            renderCriteria(criteriaData, ev.scores || []);
            calculateLiveTotal();
            saveStatus.textContent = hasExisting ? 'Final marks saved on server' : 'Enter marks and click Submit';
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

            // Preserve marks: check server first, then sessionStorage if not locked
            const sessionMarkKey = `jury_mark_${roundId}_${teamId}_${crit.id}`;
            const sessionRemKey = `jury_rem_${roundId}_${teamId}_${crit.id}`;
            let existingMark = (sc.marks !== null && sc.marks !== undefined) ? sc.marks : '';
            if (existingMark === '' && !isLocked) {
                const cachedMark = sessionStorage.getItem(sessionMarkKey);
                if (cachedMark !== null && cachedMark !== undefined && cachedMark !== '') {
                    existingMark = cachedMark;
                }
            }
            let existingRemarks = sc.remarks || '';
            if (!existingRemarks && !isLocked) {
                const cachedRem = sessionStorage.getItem(sessionRemKey);
                if (cachedRem) existingRemarks = cachedRem;
            }

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
                    sessionStorage.setItem(`jury_mark_${roundId}_${teamId}_${input.dataset.critId}`, input.value);
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
                    sessionStorage.setItem(`jury_rem_${roundId}_${teamId}_${input.dataset.critId}`, input.value);
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

    // Direct Submit as Final
    const executeSubmitFinal = async () => {
        if (!submitFinalBtn) return;
        submitFinalBtn.disabled = true;
        const originalHtml = submitFinalBtn.innerHTML;
        submitFinalBtn.textContent = 'Saving Final Marks...';

        // Auto-clean inputs: if empty, default to 0
        const markInputs = criteriaList.querySelectorAll('.criterion-mark-input');
        markInputs.forEach(input => {
            const val = input.value.trim();
            if (val === '') {
                input.value = '0';
            }
            const max = parseFloat(input.dataset.max) || 20;
            const num = parseFloat(input.value) || 0;
            if (num > max) input.value = String(max);
            if (num < 0) input.value = '0';
        });

        calculateLiveTotal();

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

            hasUnsavedChanges = false;
            statusTag.textContent = 'Status: Final Submitted';
            statusTag.className = 'score-status-tag tag-locked';
            submitFinalBtn.innerHTML = '<span>✓</span> Final Marks Saved!';
            saveStatus.textContent = 'Final marks saved on server';

            // Clear local cached draft marks on successful submit
            criteriaData.forEach(c => {
                sessionStorage.removeItem(`jury_mark_${roundId}_${teamId}_${c.id}`);
                sessionStorage.removeItem(`jury_rem_${roundId}_${teamId}_${c.id}`);
            });

            showMsg('✓ Final marks saved and submitted! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = '/judge';
            }, 1200);
        } catch (e) {
            showMsg(e.message, true);
            submitFinalBtn.disabled = false;
            submitFinalBtn.innerHTML = originalHtml;
        }
    };

    if (submitFinalBtn) {
        submitFinalBtn.addEventListener('click', executeSubmitFinal);
    }
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', executeSubmitFinal);
    }

    loadEvaluation();
});
