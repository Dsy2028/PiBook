// PiBook Web Interface - Main JavaScript

// Navigation
function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }

    // Highlight active nav item
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Auto-refresh system stats when navigating to info or navigation section
    // Load todos and open app when navigating to todo section
    if (sectionId === 'info' || sectionId === 'navigation') {
        refreshSystemStats();
    } else if (sectionId === 'todo') {
        loadTodos();
        openTodoApp();
    } else if (sectionId === 'ipscanner') {
        initIPScanner();
    } else if (sectionId === 'klipper') {
        initKlipper();
    } else if (sectionId === 'library') {
        loadReadingProgress();
    } else if (sectionId === 'logs') {
        if (!currentLogType) {
            loadLogs('app');
        } else {
            refreshActiveLogs();
        }
    }
}

// Logs Functions
let currentLogType = null;

function loadLogs(type) {
    currentLogType = type;

    // Update active tab button style
    document.getElementById('tab-app-logs').style.background = type === 'app' ? '#2196F3' : '#e0e0e0';
    document.getElementById('tab-app-logs').style.color = type === 'app' ? '#fff' : '#333';
    document.getElementById('tab-system-logs').style.background = type === 'system' ? '#2196F3' : '#e0e0e0';
    document.getElementById('tab-system-logs').style.color = type === 'system' ? '#fff' : '#333';

    const viewer = document.getElementById('log-viewer-content');
    viewer.innerHTML = `Loading ${type} logs...`;

    fetch(`/api/logs/${type}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                viewer.innerHTML = `<span style="color: #f44336;">Failed to load logs: ${escapeHtml(data.error)}</span>`;
            } else {
                viewer.innerHTML = escapeHtml(data.logs || 'No logs found.');
                // Scroll to bottom to see latest logs
                viewer.scrollTop = viewer.scrollHeight;
            }
        })
        .catch(error => {
            viewer.innerHTML = `<span style="color: #f44336;">Error fetching logs: ${escapeHtml(error.message)}</span>`;
        });
}

function refreshActiveLogs() {
    if (currentLogType) {
        loadLogs(currentLogType);
    } else {
        loadLogs('app');
    }
}

// File Upload
function uploadFile(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Upload failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            alert('Upload error: ' + error.message);
        });
}

// File Delete
function deleteFile(filename) {
    if (!confirm(`Delete "${filename}"?`)) {
        return;
    }

    fetch('/delete/' + encodeURIComponent(filename), {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Delete failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            alert('Delete error: ' + error.message);
        });
}

// Settings Form(s)
document.addEventListener('DOMContentLoaded', function () {
    const settingForms = [
        { form: document.getElementById('settings-form'), msgId: 'settings-message' },
        { form: document.getElementById('reader-settings-form'), msgId: 'reader-settings-message' }
    ];

    settingForms.forEach(({ form, msgId }) => {
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();

                const formData = new FormData(this);
                const data = {};

                // Convert form data to object
                for (let [key, value] of formData.entries()) {
                    if (key === 'show_page_numbers' || key === 'wifi_while_reading' || key === 'sleep_enabled' || key === 'bluetooth_enabled') {
                        data[key] = true;
                    } else {
                        data[key] = isNaN(value) ? value : parseFloat(value);
                    }
                }

                // Add unchecked checkboxes as false, ONLY if they exist in this specific form
                const allCheckboxIds = ['show_page_numbers', 'wifi_while_reading', 'sleep_enabled', 'bluetooth_enabled'];
                allCheckboxIds.forEach(field => {
                    const checkboxExistsInForm = this.querySelector(`input[name="${field}"], input[id="${field}"]`);
                    if (checkboxExistsInForm && !(field in data)) {
                        data[field] = false; // It exists in the form, but wasn't checked
                    }
                });

                // Save settings
                fetch('/save_settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                })
                    .then(response => response.json())
                    .then(result => {
                        const messageDiv = document.getElementById(msgId);
                        if (result.status === 'success') {
                            messageDiv.className = 'message success';
                            messageDiv.innerHTML = '<strong>✓ Settings saved successfully!</strong><br>Changes will take effect on next restart.';
                            messageDiv.style.display = 'block';
                            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                            // Reload CPU voltage after short delay
                            setTimeout(() => {
                                fetch('/api/cpu_voltage')
                                    .then(response => response.json())
                                    .then(data => {
                                        const statusEl = document.getElementById('voltage-status');
                                        if (statusEl && data.voltage) {
                                            statusEl.textContent = 'Current CPU Voltage: ' + data.voltage + ' (Undervolt: ' + data.undervolt_setting + ')';
                                        }
                                    });
                            }, 500);
                        } else {
                            throw new Error(result.error || 'Save failed');
                        }
                    })
                    .catch(error => {
                        const messageDiv = document.getElementById(msgId);
                        messageDiv.className = 'message error';
                        messageDiv.innerHTML = '<strong>❌ Error saving settings!</strong><br>' + error.message;
                        messageDiv.style.display = 'block';
                        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    });
            });
        }
    });

    // Load current CPU voltage
    fetch('/api/cpu_voltage')
        .then(response => response.json())
        .then(data => {
            const statusEl = document.getElementById('voltage-status');
            if (statusEl && data.voltage) {
                statusEl.textContent = 'Current CPU Voltage: ' + data.voltage + ' (Undervolt: ' + data.undervolt_setting + ')';
            } else if (statusEl) {
                statusEl.textContent = 'Current CPU Voltage: Unable to read';
            }
        })
        .catch(err => {
            const statusEl = document.getElementById('voltage-status');
            if (statusEl) {
                statusEl.textContent = 'Current CPU Voltage: Error loading';
            }
        });
});

// Terminal Functions
function setCommand(cmd) {
    document.getElementById('terminal-input').value = cmd;
    document.getElementById('terminal-input').focus();
}

function executeCommand() {
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const command = input.value.trim();

    if (!command) {
        return;
    }

    // Add command to output
    appendToTerminal(`<span style="color: #4CAF50;">$ ${escapeHtml(command)}</span>`);

    // Execute command using streaming response
    fetch('/terminal/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: command })
    })
        .then(async response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Parse SSE events
                    let eventEndIndex;
                    while ((eventEndIndex = buffer.indexOf('\n\n')) !== -1) {
                        const eventString = buffer.substring(0, eventEndIndex);
                        buffer = buffer.substring(eventEndIndex + 2);

                        if (eventString.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(eventString.substring(6));

                                if (data.error) {
                                    appendToTerminal(`<span style="color: #f44336;">Error: ${escapeHtml(data.error)}</span>`);
                                } else if (data.stdout !== undefined) {
                                    // Append live output retaining newlines as HTML linebreaks
                                    appendToTerminal(escapeHtml(data.stdout).replace(/\n/g, '<br>'), false);
                                } else if (data.returncode !== undefined && data.returncode !== 0) {
                                    appendToTerminal(`<br><span style="color: #f44336;">Exit code: ${data.returncode}</span><br>`);
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e, eventString);
                            }
                        }
                    }
                }
            } catch (error) {
                appendToTerminal(`<span style="color: #f44336;">Stream error: ${escapeHtml(error.message)}</span><br>`);
            }
        })
        .catch(error => {
            appendToTerminal(`<span style="color: #f44336;">Network error: ${escapeHtml(error.message)}</span><br>`);
        });

    // Clear input
    input.value = '';
}

function appendToTerminal(text, addNewline = true) {
    const output = document.getElementById('terminal-output');
    output.innerHTML += text + (addNewline ? '<br>' : '');
    // Auto-scroll to bottom
    output.scrollTop = output.scrollHeight;
}

function clearTerminal() {
    const output = document.getElementById('terminal-output');
    output.innerHTML = '<span style="color: #4CAF50;">Terminal cleared</span><br>';
}

function copyOutput() {
    const output = document.getElementById('terminal-output');
    const text = output.innerText;
    navigator.clipboard.writeText(text).then(() => {
        appendToTerminal('<span style="color: #4CAF50;">✓ Output copied to clipboard</span>');
    }).catch(err => {
        appendToTerminal('<span style="color: #f44336;">✗ Failed to copy: ' + err.message + '</span>');
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Enter key support for terminal
document.addEventListener('DOMContentLoaded', function () {
    const terminalInput = document.getElementById('terminal-input');
    if (terminalInput) {
        terminalInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                executeCommand();
            }
        });
    }
});

// System Stats
function refreshSystemStats() {
    fetch('/api/system_stats')
        .then(response => response.json())
        .then(data => {
            // Update CPU Temperature
            const tempEl = document.getElementById('cpu-temp');
            if (tempEl && data.cpu_temp) {
                tempEl.textContent = data.cpu_temp;
                // Color code based on temperature
                const temp = parseFloat(data.cpu_temp);
                if (temp < 60) {
                    tempEl.style.color = '#4CAF50'; // Green
                } else if (temp < 70) {
                    tempEl.style.color = '#ff9800'; // Orange
                } else {
                    tempEl.style.color = '#f44336'; // Red
                }
            }

            // Update CPU Voltage
            const voltageEl = document.getElementById('cpu-voltage');
            if (voltageEl && data.cpu_voltage) {
                voltageEl.textContent = data.cpu_voltage;
            }

            // Update CPU Speed
            const speedEl = document.getElementById('cpu-speed');
            if (speedEl && data.cpu_speed) {
                speedEl.textContent = data.cpu_speed;
            }

            // Update WiFi Status
            const wifiEl = document.getElementById('wifi-status');
            if (wifiEl && data.wifi_status) {
                wifiEl.textContent = data.wifi_status;
                if (data.wifi_status === 'On') {
                    wifiEl.style.color = '#4CAF50';
                } else if (data.wifi_status === 'Off') {
                    wifiEl.style.color = '#f44336';
                }
            }

            // Update Bluetooth Status
            const btEl = document.getElementById('bluetooth-status');
            if (btEl && data.bluetooth_status) {
                btEl.textContent = data.bluetooth_status;
                if (data.bluetooth_status.startsWith('On')) {
                    btEl.style.color = '#4CAF50';
                } else if (data.bluetooth_status === 'Off') {
                    btEl.style.color = '#f44336';
                }
            }

            // Update Undervolt Setting
            const undervoltEl = document.getElementById('undervolt-setting');
            if (undervoltEl) {
                const mv = Math.abs(data.undervolt) * 25;
                undervoltEl.textContent = `${data.undervolt} (-${mv}mV)`;
            }

            // Update Throttle Status
            const throttleEl = document.getElementById('throttle-status');
            if (throttleEl && data.throttle_status) {
                throttleEl.textContent = data.throttle_status;
                if (data.throttle_status === 'OK') {
                    throttleEl.style.color = '#4CAF50'; // Green
                } else {
                    throttleEl.style.color = '#f44336'; // Red
                }
                throttleEl.title = data.throttle_detail || '';
            }

            // Update OS Info
            const osEl = document.getElementById('os-info');
            if (osEl && data.os_name) {
                osEl.textContent = data.os_name;
            }

            // Update Uptime
            const uptimeEl = document.getElementById('uptime');
            if (uptimeEl && data.uptime) {
                uptimeEl.textContent = data.uptime;
            }

            // Update CPU Cores
            const coresEl = document.getElementById('cpu-cores');
            if (coresEl && data.active_cores && data.total_cores) {
                coresEl.textContent = `${data.active_cores}/${data.total_cores}`;
                // Color code: green if 1 core (power saving), blue if multiple
                if (data.active_cores === 1) {
                    coresEl.style.color = '#4CAF50'; // Green - power saving mode
                } else {
                    coresEl.style.color = '#2196F3'; // Blue - normal mode
                }
            }

            // Update Memory Usage
            const memoryEl = document.getElementById('memory-usage');
            if (memoryEl && data.memory_used && data.memory_total) {
                memoryEl.textContent = `${data.memory_used} / ${data.memory_total}`;
                // Color code based on percentage if available
                if (data.memory_percent) {
                    const percent = parseInt(data.memory_percent);
                    if (percent < 70) {
                        memoryEl.style.color = '#4CAF50'; // Green
                    } else if (percent < 85) {
                        memoryEl.style.color = '#ff9800'; // Orange
                    } else {
                        memoryEl.style.color = '#f44336'; // Red
                    }
                }
            }

            // Update Disk Space
            const diskEl = document.getElementById('disk-free');
            if (diskEl && data.disk_free) {
                if (data.disk_used && data.disk_total) {
                    diskEl.textContent = `${data.disk_free} free`;
                    diskEl.title = `${data.disk_used} used of ${data.disk_total}`;
                } else {
                    diskEl.textContent = data.disk_free;
                }
            }
        })
        .catch(error => {
            console.error('Failed to load system stats:', error);
        });
}

// Remote Control Functions
function sendCommand(command) {
    fetch('/remote/' + command, {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                alert('Command failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            alert('Error: ' + error.message);
        });
}



f
// Reading Progress Functions
function loadReadingProgress() {
    const container = document.getElementById('progress-list-container');
    if (!container) return;

    container.innerHTML = '<p style="color: #888;">Loading...</p>';

    fetch('/api/progress/list')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                container.innerHTML = '<p style="color: #c00;">Error: ' + data.error + '</p>';
                return;
            }

            if (!data.progress || data.progress.length === 0) {
                container.innerHTML = '<p style="color: #888;">No saved reading positions found.</p>';
                return;
            }

            let html = '<table style="width:100%; border-collapse: collapse;">';
            html += '<thead><tr>';
            html += '<th style="text-align:left; padding: 8px; border-bottom: 2px solid #ddd;">Book</th>';
            html += '<th style="text-align:center; padding: 8px; border-bottom: 2px solid #ddd;">Progress</th>';
            html += '<th style="text-align:right; padding: 8px; border-bottom: 2px solid #ddd;">Action</th>';
            html += '</tr></thead><tbody>';

            data.progress.forEach(function (item) {
                const pct = Math.round((item.current_page / item.total_pages) * 100);
                const displayName = item.filename.replace('.epub', '');
                const safePath = encodeURIComponent(item.path);
                html += '<tr>';
                html += '<td style="padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 0.9em;">' + displayName + '</td>';
                html += '<td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align:center; color: #666;">Page ' + item.current_page + '/' + item.total_pages + ' (' + pct + '%)</td>';
                html += '<td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align:right;">';
                html += '<button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.85em;" onclick="resetBookProgress(\'' + safePath + '\')">Reset</button>';
                html += '</td></tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        })
        .catch(function (err) {
            container.innerHTML = '<p style="color: #c00;">Failed to load progress: ' + err.message + '</p>';
        });
}

function resetBookProgress(encodedPath) {
    if (!confirm('Reset reading position for this book?')) return;
    const bookPath = decodeURIComponent(encodedPath);

    fetch('/api/progress/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: bookPath })
    })
        .then(response => response.json())
        .then(function (data) {
            showProgressMessage(
                data.status === 'success' ? '✓ ' + data.message : '❌ ' + (data.error || 'Unknown error'),
                data.status === 'success'
            );
            loadReadingProgress();
        })
        .catch(function (err) { showProgressMessage('❌ Error: ' + err.message, false); });
}

function resetAllProgress() {
    if (!confirm('Reset ALL saved reading positions? This cannot be undone.')) return;

    fetch('/api/progress/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '__all__' })
    })
        .then(response => response.json())
        .then(function (data) {
            showProgressMessage(
                data.status === 'success' ? '✓ ' + data.message : '❌ ' + (data.error || 'Unknown error'),
                data.status === 'success'
            );
            loadReadingProgress();
        })
        .catch(function (err) { showProgressMessage('❌ Error: ' + err.message, false); });
}

function showProgressMessage(msg, success) {
    const el = document.getElementById('progress-message');
    if (!el) return;
    el.className = success ? 'message success' : 'message error';
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(function () { el.style.display = 'none'; }, 4000);
}
