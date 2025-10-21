// Update range value displays
document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valueDisplay = document.getElementById(slider.id + 'Value');
    
    slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
        
        // Update building level indicators
        if (slider.id === 'houseLevel') {
            updateBuildingLevelIndicators(parseInt(e.target.value));
        }
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

// Validation: Players Alive vs Town Population
function validatePlayerCounts() {
    const playersAlive = parseInt(document.getElementById('playersAlive').value);
    const townPopulation = parseInt(document.getElementById('townPopulation').value);
    const playersAliveInput = document.getElementById('playersAlive');
    const townPopulationInput = document.getElementById('townPopulation');
    
    // Remove any existing error states
    playersAliveInput.style.borderColor = '';
    townPopulationInput.style.borderColor = '';
    
    // Validate that players alive >= town population (can't have more in town than alive)
    if (playersAlive < townPopulation) {
        playersAliveInput.style.borderColor = '#dc3545';
        townPopulationInput.style.borderColor = '#dc3545';
        return false;
    }
    
    return true;
}

// Add validation listeners
document.getElementById('playersAlive').addEventListener('input', validatePlayerCounts);
document.getElementById('townPopulation').addEventListener('input', validatePlayerCounts);

// Toggle flag configuration visibility
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const flagConfig = document.getElementById('flagConfig');
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
    const config = {
        mode: formData.get('mode'),
        numFlags: parseInt(formData.get('numFlags')),
        townDay: parseInt(formData.get('townDay')),
        playersAlive: parseInt(formData.get('playersAlive')),
        townPopulation: parseInt(formData.get('townPopulation')),
        townDefense: parseInt(formData.get('townDefense')),
        doorState: formData.get('doorState'),
        houseLevel: parseInt(formData.get('houseLevel')),
        chaos: formData.get('chaos') === 'on',
        devastated: formData.get('devastated') === 'on',
        simulations: parseInt(formData.get('simulations'))
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
    html += `<div class="result-mode">Mode: ${config.mode === 'with-flags' ? 'Flag Distribution (Mode 2)' : 'No Flags (Mode 1)'}</div>`;
    html += `<div>Attack Night of ${config.townDay} → ${config.townDay + 1}</div>`;
    html += '</div>';
    
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
        html += `<div><strong>Per Flag:</strong> ~${results.zombiesPerFlag.toFixed(2)} zombies (2.5%)</div>`;
        html += `<div><strong>Total Attracted:</strong> ~${results.totalAttracted.toFixed(2)}</div>`;
        html += `<div><strong>Remaining:</strong> ~${results.remainingForDistribution.toFixed(2)}</div>`;
        html += '</div></div>';
    }
    
    // Attack Statistics
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
        html += '✅ <strong>Excellent defense!</strong> Town is well protected against most attacks.';
        html += '</div>';
    } else if (results.defenseBrokenPct < 25) {
        html += '<div style="margin-top: 10px; padding: 8px; background: rgba(255, 193, 7, 0.2); border-radius: 4px; font-size: 0.9rem;">';
        html += '⚠️ <strong>Good defense.</strong> Most attacks are stopped, but some breakthrough.';
        html += '</div>';
    } else if (results.defenseBrokenPct < 75) {
        html += '<div style="margin-top: 10px; padding: 8px; background: rgba(255, 152, 0, 0.2); border-radius: 4px; font-size: 0.9rem;">';
        html += '⚠️ <strong>Moderate defense.</strong> Many attacks break through - consider improving defenses.';
        html += '</div>';
    } else {
        html += '<div style="margin-top: 10px; padding: 8px; background: rgba(220, 53, 69, 0.2); border-radius: 4px; font-size: 0.9rem;">';
        html += '🔴 <strong>Weak defense!</strong> Most attacks break through - urgent defense improvements needed.';
        html += '</div>';
    }
    html += '</div>';
    
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
        
        // Store data for chart rendering after HTML is inserted
        window.chartData = {
            distArray: distArray,
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
    
    const { distArray, mode, p95, p99 } = chartData;
    
    // No smoothing - use raw data for authentic bell curve
    const labels = distArray.map(d => d.attacks);
    const data = distArray.map(d => d.prob * 100); // Convert to percentage
    
    // Create gradient
    const canvas = ctx.getContext('2d');
    const gradient = canvas.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(217, 118, 52, 0.8)');
    gradient.addColorStop(1, 'rgba(217, 118, 52, 0.1)');
    
    // Find peak index for highlighting
    const peakIndex = distArray.findIndex(d => d.attacks === mode);
    
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
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
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
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(2)}% chance of ${context.label} attacks`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        p95Line: {
                            type: 'line',
                            xMin: p95,
                            xMax: p95,
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
                            xMin: p99,
                            xMax: p99,
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
            }
        }
    });
}

// Initialize
document.dispatchEvent(new Event('DOMContentLoaded'));
