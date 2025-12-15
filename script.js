// ============================================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================================

const STORAGE_KEY = 'myhordes-simulator-config';
let isLoadingValues = false;  // Flag to prevent saving during load

// Default values for all form fields
const defaultValues = {
    mode: 'no-flags',
    numFlags: 40,
    customAttackingZombies: '',
    townDay: 1,
    playersAlive: 40,
    townPopulation: 40,
    townDefense: 0,
    personalDefenseTiers: '',
    doorState: 'closed',
    houseLevel: 0,
    chaos: false,
    devastated: false,
    simulations: 1000000
};

// Save current form values to localStorage
function saveFormValues() {
    // Don't save while we're loading values (would overwrite with defaults)
    if (isLoadingValues) {
        console.log('[DEBUG] saveFormValues skipped - currently loading');
        return;
    }
    const values = {
        mode: document.querySelector('input[name="mode"]:checked')?.value || defaultValues.mode,
        numFlags: parseInt(document.getElementById('numFlags').value),
        customAttackingZombies: document.getElementById('customAttackingZombies').value,
        townDay: parseInt(document.getElementById('townDay').value),
        playersAlive: parseInt(document.getElementById('playersAlive').value),
        townPopulation: parseInt(document.getElementById('townPopulation').value),
        townDefense: parseInt(document.getElementById('townDefense').value),
        personalDefenseTiers: document.getElementById('personalDefenseTiers').value,
        doorState: document.querySelector('input[name="doorState"]:checked')?.value || defaultValues.doorState,
        houseLevel: parseInt(document.getElementById('houseLevel').value),
        chaos: document.getElementById('chaos').checked,
        devastated: document.getElementById('devastated').checked,
        simulations: parseInt(document.getElementById('simulations').value)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

// Load saved values from localStorage
function loadFormValues() {
    isLoadingValues = true;  // Prevent saving during load
    console.log('[DEBUG] loadFormValues called');
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('[DEBUG] Raw saved data:', saved);
    if (!saved) {
        console.log('[DEBUG] No saved data found, returning');
        isLoadingValues = false;  // Re-enable saving
        return;
    }
    
    try {
        const values = JSON.parse(saved);
        console.log('[DEBUG] Parsed values:', values);
        
        // Mode
        const modeRadio = document.querySelector(`input[name="mode"][value="${values.mode}"]`);
        if (modeRadio) {
            modeRadio.checked = true;
            // Trigger change event to show/hide flag config
            modeRadio.dispatchEvent(new Event('change'));
        }
        
        // Number inputs
        if (values.numFlags !== undefined) {
            console.log('[DEBUG] Setting numFlags to:', values.numFlags);
            document.getElementById('numFlags').value = values.numFlags;
            document.getElementById('numFlagsValue').textContent = values.numFlags;
        }
        if (values.customAttackingZombies !== undefined && values.customAttackingZombies !== '') {
            console.log('[DEBUG] Setting customAttackingZombies to:', values.customAttackingZombies);
            document.getElementById('customAttackingZombies').value = values.customAttackingZombies;
        }
        if (values.townDay !== undefined) {
            console.log('[DEBUG] Setting townDay to:', values.townDay, 'Element:', document.getElementById('townDay'));
            document.getElementById('townDay').value = values.townDay;
            console.log('[DEBUG] townDay after set:', document.getElementById('townDay').value);
        }
        if (values.playersAlive !== undefined) {
            console.log('[DEBUG] Setting playersAlive to:', values.playersAlive);
            document.getElementById('playersAlive').value = values.playersAlive;
            console.log('[DEBUG] playersAlive after set:', document.getElementById('playersAlive').value);
        }
        if (values.townPopulation !== undefined) {
            console.log('[DEBUG] Setting townPopulation to:', values.townPopulation);
            document.getElementById('townPopulation').value = values.townPopulation;
        }
        if (values.townDefense !== undefined) {
            console.log('[DEBUG] Setting townDefense to:', values.townDefense);
            document.getElementById('townDefense').value = values.townDefense;
            console.log('[DEBUG] townDefense after set:', document.getElementById('townDefense').value);
        }
        if (values.personalDefenseTiers !== undefined && values.personalDefenseTiers !== '') {
            console.log('[DEBUG] Setting personalDefenseTiers to:', values.personalDefenseTiers);
            document.getElementById('personalDefenseTiers').value = values.personalDefenseTiers;
        }
        
        // Door state
        const doorRadio = document.querySelector(`input[name="doorState"][value="${values.doorState}"]`);
        if (doorRadio) doorRadio.checked = true;
        
        // House level
        if (values.houseLevel !== undefined) {
            console.log('[DEBUG] Setting houseLevel to:', values.houseLevel);
            document.getElementById('houseLevel').value = values.houseLevel;
            document.getElementById('houseLevelValue').textContent = values.houseLevel;
            updateBuildingLevelIndicators(values.houseLevel);
        }
        
        // Checkboxes
        document.getElementById('chaos').checked = values.chaos || false;
        document.getElementById('devastated').checked = values.devastated || false;
        
        // Simulations
        if (values.simulations !== undefined) {
            document.getElementById('simulations').value = values.simulations;
        }
        
        // Update dependent field constraints
        updateDependentConstraints();
        
        // Update defense tiers preview
        updateDefenseTiersPreview();
        
        console.log('[DEBUG] loadFormValues completed');
        
    } catch (e) {
        console.warn('Failed to load saved form values:', e);
    } finally {
        isLoadingValues = false;  // Re-enable saving
        console.log('[DEBUG] isLoadingValues set to false');
    }
}

// Reset form to default values
function resetForm() {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    
    // Reset mode
    const noFlagsRadio = document.querySelector('input[name="mode"][value="no-flags"]');
    if (noFlagsRadio) {
        noFlagsRadio.checked = true;
        noFlagsRadio.dispatchEvent(new Event('change'));
    }
    
    // Reset all number inputs
    document.getElementById('numFlags').value = defaultValues.numFlags;
    document.getElementById('numFlagsValue').textContent = defaultValues.numFlags;
    document.getElementById('customAttackingZombies').value = '';
    document.getElementById('townDay').value = defaultValues.townDay;
    document.getElementById('playersAlive').value = defaultValues.playersAlive;
    document.getElementById('townPopulation').value = defaultValues.townPopulation;
    document.getElementById('townDefense').value = defaultValues.townDefense;
    document.getElementById('personalDefenseTiers').value = '';
    
    // Reset door state
    const closedDoor = document.querySelector('input[name="doorState"][value="closed"]');
    if (closedDoor) closedDoor.checked = true;
    
    // Reset house level
    document.getElementById('houseLevel').value = defaultValues.houseLevel;
    document.getElementById('houseLevelValue').textContent = defaultValues.houseLevel;
    updateBuildingLevelIndicators(defaultValues.houseLevel);
    
    // Reset checkboxes
    document.getElementById('chaos').checked = false;
    document.getElementById('devastated').checked = false;
    
    // Reset simulations
    document.getElementById('simulations').value = defaultValues.simulations;
    
    // Reset constraints
    updateDependentConstraints();
    
    // Clear defense preview
    document.getElementById('defenseTiersPreview').textContent = '';
    
    // Clear results
    document.getElementById('results').innerHTML = `
        <div class="results-placeholder">
            <div class="placeholder-icon"><img src="assets/img/icons/chart-simple-solid-full.svg" alt="Chart" style="width: 48px; height: 48px;"></div>
            <p>Configure your simulation and click "Run Simulation" to see results</p>
        </div>
    `;
}

// Reset button handler
document.getElementById('resetBtn')?.addEventListener('click', resetForm);

// ============================================================================
// CASCADING FIELD CONSTRAINTS
// ============================================================================

// Update constraints for fields that depend on players alive
function updateDependentConstraints() {
    const playersAlive = parseInt(document.getElementById('playersAlive').value) || 40;
    const townPopulationInput = document.getElementById('townPopulation');
    const numFlagsInput = document.getElementById('numFlags');
    
    // Update town population max to players alive
    townPopulationInput.max = playersAlive;
    
    // If current town population exceeds players alive, reduce it
    if (parseInt(townPopulationInput.value) > playersAlive) {
        townPopulationInput.value = playersAlive;
    }
    
    // Update num flags max to town population
    const townPopulation = parseInt(townPopulationInput.value) || 40;
    numFlagsInput.max = townPopulation;
    
    // If current num flags exceeds town population, reduce it
    if (parseInt(numFlagsInput.value) > townPopulation) {
        numFlagsInput.value = townPopulation;
        document.getElementById('numFlagsValue').textContent = townPopulation;
    }
}

// Validation: Players Alive vs Town Population
function validatePlayerCounts() {
    const playersAlive = parseInt(document.getElementById('playersAlive').value);
    const townPopulation = parseInt(document.getElementById('townPopulation').value);
    const playersAliveInput = document.getElementById('playersAlive');
    const townPopulationInput = document.getElementById('townPopulation');
    
    // Remove any existing error states
    playersAliveInput.style.borderColor = '';
    townPopulationInput.style.borderColor = '';
    
    // Auto-reduce dependent values when players alive decreases
    updateDependentConstraints();
    
    // Validate that players alive >= town population
    if (playersAlive < townPopulation) {
        playersAliveInput.style.borderColor = '#dc3545';
        townPopulationInput.style.borderColor = '#dc3545';
        return false;
    }
    
    // Save values after validation
    saveFormValues();
    
    return true;
}

// Update range value displays
document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valueDisplay = document.getElementById(slider.id + 'Value');
    
    slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
        
        // Update building level indicators
        if (slider.id === 'houseLevel') {
            updateBuildingLevelIndicators(parseInt(e.target.value));
        }
        
        // Save values on any range change
        saveFormValues();
    });
});

// Update building level visual indicators
function updateBuildingLevelIndicators(level) {
    document.querySelectorAll('.level-indicator').forEach((indicator, index) => {
        if (index <= level) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

// Initialize building level indicators
updateBuildingLevelIndicators(parseInt(document.getElementById('houseLevel').value));

// Add validation and save listeners
document.getElementById('playersAlive').addEventListener('input', validatePlayerCounts);
document.getElementById('townPopulation').addEventListener('input', () => {
    validatePlayerCounts();
    updateDependentConstraints();  // Update flag max when town population changes
    saveFormValues();
});

// Add save listeners to all inputs
// Use 'input' for text/number fields (fires on every keystroke)
// Use 'change' for checkboxes, radios, and selects (fires on value change)
document.querySelectorAll('#simulatorForm input[type="number"], #simulatorForm input[type="text"]').forEach(input => {
    input.addEventListener('input', saveFormValues);
});
document.querySelectorAll('#simulatorForm input[type="checkbox"], #simulatorForm input[type="radio"], #simulatorForm select').forEach(input => {
    input.addEventListener('change', saveFormValues);
});

// Load saved values on page load
// Check if DOM is already ready (script is at end of body)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFormValues);
} else {
    // DOM is already ready, call immediately
    loadFormValues();
}

// Parse defense tiers from input string
// Formats supported: "38x60, 2x61" or "38*60, 2*61" or "60:38, 61:2"
function parseDefenseTiers(input) {
    if (!input || input.trim() === '') return [];
    
    const tiers = [];
    const parts = input.split(/[,;]/);
    
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        
        // Try format: "38x60" or "38*60" (count x defense)
        let match = trimmed.match(/^(\d+)\s*[xX*]\s*(\d+)$/);
        if (match) {
            tiers.push({ count: parseInt(match[1]), defense: parseInt(match[2]) });
            continue;
        }
        
        // Try format: "60:38" (defense : count)
        match = trimmed.match(/^(\d+)\s*:\s*(\d+)$/);
        if (match) {
            tiers.push({ count: parseInt(match[2]), defense: parseInt(match[1]) });
            continue;
        }
        
        // Try format: just a number (assume count of 1)
        match = trimmed.match(/^(\d+)$/);
        if (match) {
            tiers.push({ count: 1, defense: parseInt(match[1]) });
        }
    }
    
    return tiers;
}

// Update defense tiers preview
function updateDefenseTiersPreview() {
    const input = document.getElementById('personalDefenseTiers').value;
    const preview = document.getElementById('defenseTiersPreview');
    const tiers = parseDefenseTiers(input);
    
    if (tiers.length === 0) {
        preview.textContent = '';
        return;
    }
    
    const totalCitizens = tiers.reduce((sum, t) => sum + t.count, 0);
    const minDef = Math.min(...tiers.map(t => t.defense));
    const tierText = tiers.map(t => `${t.count}×${t.defense}`).join(', ');
    preview.innerHTML = `<strong>${totalCitizens} citizens:</strong> ${tierText} | <strong>Lowest:</strong> ${minDef} def`;
}

// Add listener for defense tiers input
document.getElementById('personalDefenseTiers')?.addEventListener('input', updateDefenseTiersPreview);

// Toggle flag configuration visibility
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const flagConfig = document.getElementById('flagConfig');
        if (!flagConfig) return; // Safety check
        
        if (e.target.value === 'with-flags') {
            flagConfig.style.display = 'block';
        } else {
            flagConfig.style.display = 'none';
        }
    });
});

// Door state visual feedback
document.querySelectorAll('.door-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.door-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
    });
});

// Form submission
document.getElementById('simulatorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate before submission
    if (!validatePlayerCounts()) {
        document.getElementById('results').innerHTML = `
            <div class="error">
                <p>❌ Validation Error: Players in Town cannot exceed Total Players Alive</p>
            </div>
        `;
        return;
    }
    
    const formData = new FormData(e.target);
    const customZombiesValue = formData.get('customAttackingZombies');
    
    // Parse personal defense tiers (e.g., "38x60, 2x61" -> [{count: 38, defense: 60}, {count: 2, defense: 61}])
    const defenseTiersInput = formData.get('personalDefenseTiers') || '';
    const personalDefenseTiers = parseDefenseTiers(defenseTiersInput);
    
    const config = {
        mode: formData.get('mode'),
        numFlags: parseInt(formData.get('numFlags')),
        customAttackingZombies: customZombiesValue && customZombiesValue.trim() !== '' ? parseInt(customZombiesValue) : null,
        townDay: parseInt(formData.get('townDay')),
        playersAlive: parseInt(formData.get('playersAlive')),
        townPopulation: parseInt(formData.get('townPopulation')),
        townDefense: parseInt(formData.get('townDefense')),
        doorState: formData.get('doorState'),
        houseLevel: parseInt(formData.get('houseLevel')),
        chaos: formData.get('chaos') === 'on',
        devastated: formData.get('devastated') === 'on',
        simulations: parseInt(formData.get('simulations')),
        personalDefenseTiers: personalDefenseTiers
    };
    
    // Show loading
    document.getElementById('results').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Running ${config.simulations.toLocaleString()} simulations...</p>
        </div>
    `;
    
    try {
        // Call PHP backend
        const response = await fetch('simulate.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const results = await response.json();
        displayResults(results, config);
    } catch (error) {
        document.getElementById('results').innerHTML = `
            <div class="error">
                <p>❌ Error running simulation: ${error.message}</p>
            </div>
        `;
    }
});

function displayResults(results, config) {
    const doorStateText = {
        'closed': 'Closed',
        'open-recent': 'Open (<30min)',
        'open-long': 'Open (>30min)'
    };
    
    let html = '<div class="results-content">';
    
    // Header
    html += '<div class="result-header">';
    const modeText = config.mode === 'with-flags' ? 'Flag Distribution (Mode 2)' : 'No Flags (Mode 1)';
    html += `<div class="result-mode">Mode: ${modeText}</div>`;
    html += `<div>Attack Night of ${config.townDay} → ${config.townDay + 1}</div>`;
    html += '</div>';
    
    // Show custom zombies notice if overridden
    if (results.usingCustomZombies) {
        html += '<div class="stat-card" style="grid-column: 1/-1; margin-bottom: 15px; background: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107;">';
        html += '<h3 style="margin-bottom: 10px; color: #ffc107;"><img src="assets/img/icons/skull-solid-full.svg" class="icon" style="width:20px;height:20px;"> Using Custom Zombie Count</h3>';
        html += `<div style="font-size: 0.9rem;">`;
        html += `<strong>Overridden attacking zombies:</strong> ${results.customZombies} (skipping automatic calculation)`;
        html += '</div></div>';
    }
    
    // Game Conditions
    html += '<div class="stat-card" style="grid-column: 1/-1; margin-bottom: 15px;">';
    html += '<h3 style="margin-bottom: 10px; color: var(--warning);">Game Conditions</h3>';
    html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.9rem;">`;
    html += `<div><img src="assets/img/icons/users-solid-full.svg" class="icon" style="width:16px;height:16px;"> Players: ${config.playersAlive}</div>`;
    html += `<div><img src="assets/img/icons/crosshairs-solid-full.svg" class="icon" style="width:16px;height:16px;"> Targets: ${results.targetsPerNight}</div>`;
    html += `<div><img src="assets/img/home/alarm.gif" class="icon" style="width:16px;height:16px;"> Door: ${doorStateText[config.doorState]}</div>`;
    html += `<div><img src="assets/img/home/home_lv${config.houseLevel}.gif" class="icon" style="width:16px;height:16px;"> Buildings: Lv${config.houseLevel}</div>`;
    html += `<div><img src="assets/img/home/defense.gif" class="icon" style="width:16px;height:16px;"> Defense: ${config.townDefense}</div>`;
    html += `<div><img src="assets/img/icons/calendar-solid-full.svg" class="icon" style="width:16px;height:16px;"> Day: ${config.townDay + 1}</div>`;
    if (config.chaos || config.devastated) {
        html += `<div style="grid-column: 1/-1;">`;
        if (config.chaos) html += '<img src="assets/img/icons/explosion-solid-full.svg" class="icon" style="width:16px;height:16px;"> Chaos ';
        if (config.devastated) html += '<img src="assets/img/icons/fire-solid-full.svg" class="icon" style="width:16px;height:16px;"> Devastated';
        html += `</div>`;
    }
    html += '</div></div>';
    
    // Flag Configuration
    if (config.mode === 'with-flags') {
        html += '<div class="stat-card" style="grid-column: 1/-1; margin-bottom: 15px; border-left: 4px solid var(--warning);">';
        html += '<h3 style="margin-bottom: 10px; color: var(--warning);"><img src="assets/img/items/flag.gif" class="icon" style="width:20px;height:20px;"> Flag Configuration</h3>';
        html += `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">`;
        html += `<div><strong>Flags:</strong> ${config.numFlags}</div>`;
        const flagPercentage = (results.zombiesPerFlag / results.avgAttacking * 100).toFixed(2);
        html += `<div><strong>Per Flag:</strong> ~${results.zombiesPerFlag.toFixed(2)} zombies (${flagPercentage}%)</div>`;
        html += `<div><strong>Total Attracted:</strong> ~${results.totalAttracted.toFixed(2)}</div>`;
        html += `<div><strong>Remaining:</strong> ~${results.remainingForDistribution.toFixed(2)}</div>`;
        html += '</div></div>';
    }
    
    // Attack Statistics (skip calculations when using custom zombies)
    if (!results.usingCustomZombies) {
        html += '<div class="result-stats">';
        html += `
            <div class="stat-card" style="background: rgba(220, 53, 69, 0.1); border-left: 4px solid #dc3545;">
                <div class="stat-label">Min Total Zombies</div>
                <div class="stat-value">${results.minTotalZombies}</div>
                <div style="font-size: 0.75rem; color: #999; margin-top: 4px;">Raw game value</div>
            </div>
            <div class="stat-card" style="background: rgba(220, 53, 69, 0.1); border-left: 4px solid #dc3545;">
                <div class="stat-label">Average Total Zombies</div>
                <div class="stat-value">${results.avgTotalZombies.toFixed(2)}</div>
                <div style="font-size: 0.75rem; color: #999; margin-top: 4px;">Before defense/active</div>
            </div>
            <div class="stat-card" style="background: rgba(220, 53, 69, 0.1); border-left: 4px solid #dc3545;">
                <div class="stat-label">Max Total Zombies</div>
                <div class="stat-value">${results.maxTotalZombies}</div>
                <div style="font-size: 0.75rem; color: #999; margin-top: 4px;">Raw game value</div>
            </div>
        `;
        html += '</div>';
        
        html += '<div class="result-stats" style="margin-top: 10px;">';
        html += `
            <div class="stat-card">
                <div class="stat-label">Min Attacking Zombies</div>
                <div class="stat-value">${results.minAttacking}</div>
                <div style="font-size: 0.75rem; color: #999; margin-top: 4px;">After defense/active</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Attacking Zombies</div>
                <div class="stat-value">${results.avgAttacking.toFixed(2)}</div>
                <div style="font-size: 0.75rem; color: #999; margin-top: 4px;">Actual threats</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Max Attacking Zombies</div>
                <div class="stat-value">${results.maxAttacking}</div>
                <div style="font-size: 0.75rem; color: #999; margin-top: 4px;">After defense/active</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Simulations Run</div>
                <div class="stat-value">${results.simulations.toLocaleString()}</div>
            </div>
        `;
        html += '</div>';
        
        // Defense Breakthrough Stats
        html += '<div class="stat-card" style="grid-column: 1/-1; margin-top: 10px; background: ' + 
                (results.defenseBrokenPct >= 50 ? 'rgba(220, 53, 69, 0.1)' : 'rgba(40, 167, 69, 0.1)') + 
                '; border-left: 4px solid ' + 
                (results.defenseBrokenPct >= 50 ? '#dc3545' : '#28a745') + ';">';
        html += '<h3 style="margin-bottom: 10px; color: var(--warning);">' +
                '<img src="assets/img/home/defense.gif" class="icon" style="width:20px;height:20px;"> ' +
                'Defense Analysis</h3>';
        html += `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">`;
        html += `<div><strong>Defense Broken:</strong> ${results.defenseBrokenPct.toFixed(2)}% of attacks</div>`;
        html += `<div><strong>Attacks Count:</strong> ${results.attacksBrokeDefense.toLocaleString()} / ${results.simulations.toLocaleString()}</div>`;
        html += '</div>';
        if (results.defenseBrokenPct < 1) {
            html += '<div style="margin-top: 10px; padding: 8px; background: rgba(40, 167, 69, 0.2); border-radius: 4px; font-size: 0.9rem;">';
            html += '<strong>Excellent defense!</strong> Town is well protected against most attacks.';
            html += '</div>';
        } else if (results.defenseBrokenPct < 25) {
            html += '<div style="margin-top: 10px; padding: 8px; background: rgba(255, 193, 7, 0.2); border-radius: 4px; font-size: 0.9rem;">';
            html += '<strong>Good defense.</strong> Most attacks are stopped, but some breakthrough.';
            html += '</div>';
        } else if (results.defenseBrokenPct < 75) {
            html += '<div style="margin-top: 10px; padding: 8px; background: rgba(255, 152, 0, 0.2); border-radius: 4px; font-size: 0.9rem;">';
            html += '<strong>Moderate defense.</strong> Many attacks break through - consider improving defenses.';
            html += '</div>';
        } else {
            html += '<div style="margin-top: 10px; padding: 8px; background: rgba(220, 53, 69, 0.2); border-radius: 4px; font-size: 0.9rem;">';
            html += '<strong>Weak defense!</strong> Most attacks break through - urgent defense improvements needed.';
            html += '</div>';
        }
        html += '</div>';
        
        // Survival Statistics (if personal defense tiers were provided)
        if (results.survivalStats) {
            const stats = results.survivalStats;
            const survivalColor = stats.survivalRate >= 95 ? '#28a745' : 
                                  stats.survivalRate >= 75 ? '#ffc107' : '#dc3545';
            const survivalBg = stats.survivalRate >= 95 ? 'rgba(40, 167, 69, 0.1)' : 
                               stats.survivalRate >= 75 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(220, 53, 69, 0.1)';
            
            html += `<div class="stat-card" style="grid-column: 1/-1; margin-top: 10px; background: ${survivalBg}; border-left: 4px solid ${survivalColor};">`;
            html += '<h3 style="margin-bottom: 10px; color: var(--warning);">' +
                    '<img src="assets/img/icons/shield-halved-solid-full.svg" class="icon" style="width:20px;height:20px;"> ' +
                    'Survival Analysis</h3>';
            html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">`;
            html += `<div><strong>Lowest Personal Def:</strong> ${stats.lowestPersonalDefense}</div>`;
            html += `<div><strong>Citizens Tracked:</strong> ${stats.totalCitizensTracked}</div>`;
            html += `<div><strong>Survival Rate:</strong> <span style="color: ${survivalColor}; font-weight: bold;">${stats.survivalRate.toFixed(2)}%</span></div>`;
            html += `<div><strong>Death Probability:</strong> ${stats.deathProbability.toFixed(2)}%</div>`;
            html += `<div><strong>Sims with Deaths:</strong> ${stats.simulationsWithDeaths.toLocaleString()}</div>`;
            html += `<div><strong>Avg Deaths (when occur):</strong> ${stats.avgDeathsWhenOccur.toFixed(2)}</div>`;
            html += '</div>';
            
            if (stats.survivalRate >= 99) {
                html += '<div style="margin-top: 10px; padding: 8px; background: rgba(40, 167, 69, 0.2); border-radius: 4px; font-size: 0.9rem;">';
                html += '<strong>Excellent!</strong> Almost no risk of death. Personal defenses are sufficient.';
                html += '</div>';
            } else if (stats.survivalRate >= 95) {
                html += '<div style="margin-top: 10px; padding: 8px; background: rgba(40, 167, 69, 0.2); border-radius: 4px; font-size: 0.9rem;">';
                html += '<strong>Very Good!</strong> Low risk of death, but not impossible.';
                html += '</div>';
            } else if (stats.survivalRate >= 75) {
                html += '<div style="margin-top: 10px; padding: 8px; background: rgba(255, 193, 7, 0.2); border-radius: 4px; font-size: 0.9rem;">';
                html += '<strong>Risky!</strong> Significant chance of deaths. Consider improving personal defenses.';
                html += '</div>';
            } else {
                html += '<div style="margin-top: 10px; padding: 8px; background: rgba(220, 53, 69, 0.2); border-radius: 4px; font-size: 0.9rem;">';
                html += '<strong>Dangerous!</strong> High probability of deaths. Urgent action needed.';
                html += '</div>';
            }
            html += '</div>';
        }
    } else {
        // For custom zombies, just show simulation count
        html += '<div class="result-stats" style="margin-top: 10px;">';
        html += `
            <div class="stat-card">
                <div class="stat-label">Simulations Run</div>
                <div class="stat-value">${results.simulations.toLocaleString()}</div>
            </div>
        `;
        html += '</div>';
    }
    
    // Distribution Probabilities
    html += '<div class="probability-bars">';
    html += '<h3 style="margin-bottom: 10px; color: var(--warning);"><img src="assets/img/icons/chart-simple-solid-full.svg" class="icon" style="width:20px;height:20px;"> Attack Distribution</h3>';
    if (results.defenseBrokenPct > 0) {
        html += '<p style="font-size: 0.9rem; color: #999; margin-bottom: 10px;">Based on <strong>' + 
                results.attacksBrokeDefense.toLocaleString() + 
                '</strong> simulations where defense was broken (' + 
                results.defenseBrokenPct.toFixed(2) + '% of total)</p>';
        
        // Show distribution statistics
        if (results.distributionStats && results.distributionStats.mode !== undefined) {
            html += '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; font-size: 0.85rem; background: rgba(255, 255, 255, 0.03); padding: 10px; border-radius: 4px;">';
            html += `<div><strong>Peak:</strong> ${results.distributionStats.mode} attacks (${(results.distributionStats.mode_value * 100).toFixed(2)}%)</div>`;
            html += `<div><strong>Max:</strong> ${results.distributionStats.max_attacks} attacks</div>`;
            html += `<div><strong>90th %ile:</strong> ${results.distributionStats.p90} attacks</div>`;
            html += `<div><strong>99th %ile:</strong> ${results.distributionStats.p99} attacks</div>`;
            html += '</div>';
        }
    } else {
        html += '<p style="font-size: 0.9rem; color: #28a745; margin-bottom: 15px;">⚡ <strong>Defense held in all simulations!</strong> No zombies broke through.</p>';
    }
    
    // Determine grouping strategy based on distribution
    const isFlagMode = config.mode === 'with-flags';
    const maxAttacks = results.distributionStats ? results.distributionStats.max_attacks : 0;
    
    // Always show chart if we have distribution data
    const showChart = maxAttacks > 0 && results.defenseBrokenPct > 0;
    
    // For flag mode or low variance, use simple grouping
    // For high variance, show detailed ranges
    const showDetailedDistribution = !isFlagMode && maxAttacks > 10;
    
    if (showChart) {
        // Add canvas for chart
        html += '<div style="margin-bottom: 20px; background: rgba(255, 255, 255, 0.03); padding: 15px; border-radius: 8px;">';
        html += '<canvas id="distributionChart" style="max-height: 300px;"></canvas>';
        html += '</div>';
        
        // Convert object to array and sort by attack count
        const distArray = Object.entries(results.distribution).map(([attacks, prob]) => ({
            attacks: parseInt(attacks),
            prob: prob
        })).sort((a, b) => a.attacks - b.attacks);
        
        // Convert cumulative distribution for chart
        const cumulativeArray = Object.entries(results.cumulativeDistribution).map(([attacks, cumProb]) => ({
            attacks: parseInt(attacks),
            cumProb: cumProb
        })).sort((a, b) => a.attacks - b.attacks);
        
        // Store data for chart rendering after HTML is inserted
        window.chartData = {
            distArray: distArray,
            cumulativeArray: cumulativeArray,
            mode: results.distributionStats.mode,
            p95: results.distributionStats.p95,
            p99: results.distributionStats.p99
        };
    }
    
    if (showDetailedDistribution) {
        // Convert object to array and sort by attack count
        const distArray = Object.entries(results.distribution).map(([attacks, prob]) => ({
            attacks: parseInt(attacks),
            prob: prob
        })).sort((a, b) => a.attacks - b.attacks);
        
        // Group into ranges: 0, 1-2, 3-4, 5-7, 8-10, 11-15, 16-20, 21-30, 31-40, 41+
        const ranges = [
            { min: 0, max: 0, label: '0' },
            { min: 1, max: 2, label: '1-2' },
            { min: 3, max: 4, label: '3-4' },
            { min: 5, max: 7, label: '5-7' },
            { min: 8, max: 10, label: '8-10' },
            { min: 11, max: 15, label: '11-15' },
            { min: 16, max: 20, label: '16-20' },
            { min: 21, max: 30, label: '21-30' },
            { min: 31, max: 40, label: '31-40' },
            { min: 41, max: 999, label: '41+' }
        ];
        
        const groupedDist = ranges.map(range => {
            const prob = distArray
                .filter(d => d.attacks >= range.min && d.attacks <= range.max)
                .reduce((sum, d) => sum + d.prob, 0);
            return { label: range.label, prob: prob, range: range };
        }).filter(g => g.prob > 0.0001); // Only show ranges with >0.01% probability
        
        groupedDist.forEach(group => {
            const percentage = (group.prob * 100).toFixed(2);
            const isPeak = results.distributionStats.mode >= group.range.min && 
                          results.distributionStats.mode <= group.range.max;
            
            html += '<div class="probability-item">';
            html += `<div class="probability-label">`;
            html += `<span>P(${group.label} attacks)${isPeak ? ' 📊' : ''}</span>`;
            html += `<span><strong>${percentage}%</strong></span>`;
            html += `</div>`;
            html += `<div class="probability-bar">`;
            html += `<div class="probability-fill" style="width: ${Math.min(group.prob * 100, 100)}%; background-color: ${isPeak ? '#ff8c42' : '#d97634'}"></div>`;
            html += `</div>`;
            html += '</div>';
        });
    } else {
        // Simple grouping for flag mode or low attack counts
        const distArray = Object.entries(results.distribution).map(([attacks, prob]) => ({
            attacks: parseInt(attacks),
            prob: prob
        })).sort((a, b) => a.attacks - b.attacks);
        
        // Show 0-6 individually, 7+ grouped
        for (let i = 0; i <= 6; i++) {
            const item = distArray.find(d => d.attacks === i);
            const prob = item ? item.prob : 0;
            const percentage = (prob * 100).toFixed(4);
            const isPeak = results.distributionStats.mode === i;
            
            html += '<div class="probability-item">';
            html += `<div class="probability-label">`;
            html += `<span>P(${i} attacks)${isPeak ? ' 📊' : ''}</span>`;
            html += `<span><strong>${percentage}%</strong></span>`;
            html += `</div>`;
            html += `<div class="probability-bar">`;
            html += `<div class="probability-fill" style="width: ${Math.min(prob * 100, 100)}%; background-color: ${isPeak ? '#ff8c42' : '#d97634'}"></div>`;
            html += `</div>`;
            html += '</div>';
        }
        
        // 7+ grouped
        const prob7plus = distArray.filter(d => d.attacks >= 7).reduce((sum, d) => sum + d.prob, 0);
        if (prob7plus > 0) {
            const percentage = (prob7plus * 100).toFixed(4);
            const isPeak = results.distributionStats.mode >= 7;
            
            html += '<div class="probability-item">';
            html += `<div class="probability-label">`;
            html += `<span>P(7+ attacks)${isPeak ? ' 📊' : ''}</span>`;
            html += `<span><strong>${percentage}%</strong></span>`;
            html += `</div>`;
            html += `<div class="probability-bar">`;
            html += `<div class="probability-fill" style="width: ${Math.min(prob7plus * 100, 100)}%; background-color: ${isPeak ? '#ff8c42' : '#d97634'}"></div>`;
            html += `</div>`;
            html += '</div>';
        }
    }
    
    html += '</div>';
    html += '</div>';
    
    document.getElementById('results').innerHTML = html;
    
    // Render chart if we have the data
    if (window.chartData) {
        renderDistributionChart(window.chartData);
        window.chartData = null; // Clean up
    }
}

// Global variable to store chart instance
let distributionChartInstance = null;

function renderDistributionChart(chartData) {
    const ctx = document.getElementById('distributionChart');
    if (!ctx) return;
    
    // Destroy previous chart if it exists
    if (distributionChartInstance) {
        distributionChartInstance.destroy();
    }
    
    const { distArray, cumulativeArray, mode, p95, p99 } = chartData;
    
    // No smoothing - use raw data for authentic bell curve
    const labels = distArray.map(d => d.attacks);
    const data = distArray.map(d => d.prob * 100); // Convert to percentage
    
    // Create lookup map for cumulative probabilities
    const cumulativeMap = {};
    cumulativeArray.forEach(item => {
        cumulativeMap[item.attacks] = item.cumProb;
    });
    
    // Debug: Check what cumulative probability we have at the percentile markers
    console.log('=== PERCENTILE DEBUG ===');
    console.log('p95 attack value:', p95);
    console.log('Cumulative at p95:', cumulativeMap[p95] ? (cumulativeMap[p95] * 100).toFixed(2) + '%' : 'NOT FOUND');
    console.log('p99 attack value:', p99);
    console.log('Cumulative at p99:', cumulativeMap[p99] ? (cumulativeMap[p99] * 100).toFixed(2) + '%' : 'NOT FOUND');
    console.log('All labels:', labels.slice(0, 20), '...');
    console.log('Total labels:', labels.length);
    
    // Find what the cumulative distribution looks like around p95
    console.log('\nCumulative around p95:');
    cumulativeArray.forEach(item => {
        if (item.attacks >= p95 - 5 && item.attacks <= p95 + 5) {
            console.log(`  ${item.attacks} attacks: ${(item.cumProb * 100).toFixed(2)}%`);
        }
    });
    
    // Create gradient
    const canvas = ctx.getContext('2d');
    const gradient = canvas.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(217, 118, 52, 0.8)');
    gradient.addColorStop(1, 'rgba(217, 118, 52, 0.1)');
    
    // Find peak index for highlighting
    const peakIndex = distArray.findIndex(d => d.attacks === mode);
    
    // Find the INDEX in the labels array for percentile markers
    // Chart.js annotation uses array indices, not label values!
    const p95Index = labels.findIndex(label => label === p95);
    const p99Index = labels.findIndex(label => label === p99);
    
    console.log('p95 index in labels array:', p95Index, '(attack value:', p95, ')');
    console.log('p99 index in labels array:', p99Index, '(attack value:', p99, ')');
    
    distributionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probability (%)',
                data: data,
                borderColor: '#d97634',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4, // Smooth curves for better visual
                pointRadius: distArray.map((d, i) => i === peakIndex ? 6 : 0),
                pointBackgroundColor: '#ff8c42',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                // Make hover detection much easier
                pointHitRadius: 20,  // Larger click/hover detection area
                pointHoverRadius: 8,  // Show bigger point on hover
                pointHoverBackgroundColor: '#ff8c42',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            // Make hover/interaction much more forgiving
            interaction: {
                mode: 'index',        // Show tooltip for nearest x-value
                intersect: false,     // Don't require hovering exactly on the line
                axis: 'x'             // Only consider x-axis distance
            },
            hover: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Attack Distribution Curve',
                    color: '#ffa500',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    titleColor: '#ffa500',
                    bodyColor: '#fff',
                    borderColor: '#d97634',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(context) {
                            const attacks = context[0].label;
                            return `${attacks} Zombie Attacks`;
                        },
                        label: function(context) {
                            const attacks = context.label;
                            const individualProb = context.parsed.y.toFixed(2);
                            const cumulativeProb = cumulativeMap[attacks] ? (cumulativeMap[attacks] * 100).toFixed(2) : '0.00';
                            
                            return [
                                `📊 Individual: ${individualProb}%`,
                                `📈 Cumulative: ${cumulativeProb}%`
                            ];
                        },
                        afterBody: function(context) {
                            const attacks = parseInt(context[0].label);
                            const cumulativeProb = cumulativeMap[attacks] ? cumulativeMap[attacks] * 100 : 0;
                            
                            // Add helpful context about what this means
                            if (cumulativeProb >= 99) {
                                return ['', '✅ Very rare to exceed this'];
                            } else if (cumulativeProb >= 95) {
                                return ['', '⚠️ Top 5% worst case'];
                            } else if (cumulativeProb >= 90) {
                                return ['', '⚠️ Top 10% worst case'];
                            }
                            return [];
                        }
                    }
                },
                annotation: {
                    annotations: {
                        p95Line: {
                            type: 'line',
                            xMin: p95Index,
                            xMax: p95Index,
                            borderColor: 'rgba(255, 193, 7, 0.8)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                display: true,
                                content: `95th: ${p95}`,
                                position: 'start',
                                backgroundColor: 'rgba(255, 193, 7, 0.8)',
                                color: '#000',
                                font: {
                                    size: 11,
                                    weight: 'bold'
                                }
                            }
                        },
                        p99Line: {
                            type: 'line',
                            xMin: p99Index,
                            xMax: p99Index,
                            borderColor: 'rgba(220, 53, 69, 0.8)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                display: true,
                                content: `99th: ${p99}`,
                                position: 'start',
                                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                                color: '#fff',
                                font: {
                                    size: 11,
                                    weight: 'bold'
                                }
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Number of Attacks',
                        color: '#999',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        color: '#999',
                        maxTicksLimit: 20,
                        callback: function(value, index) {
                            // Show every Nth label to avoid crowding
                            const step = Math.ceil(labels.length / 15);
                            return index % step === 0 ? labels[index] : '';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Probability (%)',
                        color: '#999',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        color: '#999',
                        callback: function(value) {
                            return value.toFixed(2) + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            },
            // Custom plugin for vertical crosshair line
            onHover: (event, elements, chart) => {
                chart.canvas.style.cursor = elements.length ? 'pointer' : 'crosshair';
            }
        },
        plugins: [{
            id: 'crosshairLine',
            afterDraw: (chart) => {
                if (chart.tooltip?._active?.length) {
                    const ctx = chart.ctx;
                    const activePoint = chart.tooltip._active[0];
                    const x = activePoint.element.x;
                    const topY = chart.scales.y.top;
                    const bottomY = chart.scales.y.bottom;
                    
                    // Draw vertical line
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, topY);
                    ctx.lineTo(x, bottomY);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
                    ctx.setLineDash([3, 3]);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }]
    });
}

// Initialize
document.dispatchEvent(new Event('DOMContentLoaded'));
