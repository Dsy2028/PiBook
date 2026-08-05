"""
Flask web server for PiBook remote control and file management.
Provides web interface for:
- Uploading/managing EPUB files
- Remote navigation (next/prev/select buttons)
- Book selection
"""

from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for, Response
import os
import logging
import json
from werkzeug.utils import secure_filename
from pathlib import Path
import socket
import requests
import time
import sys

CALIBRE_URL = "http://192.168.0.211:8080"


BASE_DIR   = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CACHE_PATH = os.path.join(BASE_DIR, 'cache', 'books.json')
DOWNLOADED_BOOKS_PATH = os.path.join(BASE_DIR, 'cache', 'downloaded')

MAX_RETRIES = 3
RETRY_DELAY = 30

mode = "offline"

""" def  setCachePath():
    if sys.platform == 'win32':
        # Windows dev path — relative to project root
        BASE_DIR   = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        CACHE_PATH = os.path.join(BASE_DIR, 'cache', 'books.json')
    else:
        # Production Pi path
        CACHE_PATH = '/home/pi/PiBook/cache/books.json' """

def startup():
    global mode
    
    try:
        socket.setdefaulttimeout(2)
        socket.create_connection((CALIBRE_URL.split("//")[1].split(":")[0], 8080))
    except OSError:
        mode = "offline"
        return


    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.get(f"{CALIBRE_URL}/ajax/books", timeout=5)
            
            if r.ok:
                print(r._content)
                os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
                with open(CACHE_PATH, "w") as f:
                    json.dump(r.json(), f)
                mode = "online"
                return
        except Exception:
            pass
        if attempt < MAX_RETRIES:
            time.sleep(RETRY_DELAY)

    mode = "offline"  # all retries failed
  

class PiBookWebServer:
    """
    Web server for remote control and file management
    """
    


    def __init__(self, books_dir: str, app_instance, port: int = 5000, version: str = "v1.0"):
        """
        Initialize web server

        Args:
            books_dir: Path to books directory
            app_instance: PiBookApp instance for remote control
            port: Port to run server on
            version: PiBook version string
        """
        self.logger = logging.getLogger(__name__)
        self.books_dir = books_dir
        self.app_instance = app_instance
        self.port = port
        self.version = version
        
        # Configure Flask with template and static folders
        template_dir = os.path.join(os.path.dirname(__file__), 'templates')
        static_dir = os.path.join(os.path.dirname(__file__), 'static')
        self.flask_app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
        self.flask_app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size


        self._setup_routes()
    def get_downloaded_ids(self):
        downloaded_ids = []
        if os.path.exists(DOWNLOADED_BOOKS_PATH):
            for filename in os.listdir(DOWNLOADED_BOOKS_PATH):
                if filename.endswith('.epub'):
                    book_id = filename.split('_')[0]
                    print(book_id, flush=True)
                    if book_id.isdigit():
                        downloaded_ids.append(book_id)
        return downloaded_ids


    def _setup_routes(self):
        """Setup Flask routes"""

        @self.flask_app.route('/')
        def index():
            """Main page with file manager and controls"""
            settings_data = self._load_settings('settings.json')
            return render_template('base.html', books=self._get_books(), settings=settings_data, version=self.version)
        
        
        @self.flask_app.route('/api/status')
        def get_status():
          return jsonify({ "mode": mode })  # "online" or "offline"

        @self.flask_app.route('/api/books')
        def get_books():
            """Serve cached Calibre book catalog"""
            try:
                with open(CACHE_PATH) as f:
                    return jsonify(json.load(f))
            except FileNotFoundError:
                return jsonify({}), 404

        @self.flask_app.route('/api/books/downloaded')
        def get_downloaded():
            return jsonify(self.get_downloaded_ids())

        @self.flask_app.route('/api/books/download', methods=['POST'])
        def download_books():

            data     = request.get_json()
            print(data)
            book_ids = data.get('book_ids', [])
            print(book_ids)
            
            # Load the cached book catalog so we know each book's download URL
            try:
                with open(CACHE_PATH) as f:
                    catalog = json.load(f)
            except FileNotFoundError:
                return jsonify({'error': 'Book catalog not found'}), 404

            downloaded = []
            failed     = []

            for book_id in book_ids:
                book = catalog.get(str(book_id))
                if not book:
                    failed.append(book_id)
                    continue

                # Get the epub download path from the catalog
                epub_path = book.get('main_format', {}).get('epub')
                print(epub_path)
                if not epub_path:
                    failed.append(book_id)
                    continue

                # Build the full URL and fetch from Calibre
                url = f"{CALIBRE_URL}{epub_path}"
                try:
                    r = requests.get(url, timeout=30)
                    if r.ok:
                        # Use book id + title as filename to avoid collisions
                        title    = book.get('title', f'book_{book_id}')
                        safe     = secure_filename(f"{book_id}_{title}.epub")
                        os.makedirs(DOWNLOADED_BOOKS_PATH, exist_ok=True)
                        filepath = os.path.join(DOWNLOADED_BOOKS_PATH, safe)
                        with open(filepath, 'wb') as f:
                            f.write(r.content)
                        downloaded.append(book_id)
                    else:
                        failed.append(book_id)
                except Exception as e:
                    self.logger.error(f"Failed to download book {book_id}: {e}")
                    failed.append(book_id)

            return jsonify({
                'status':     'ok',
                'downloaded': downloaded,
                'failed':     failed,
            })

        @self.flask_app.route('/api/books/delete', methods=['POST'])
        def delete_books():
            data     = request.get_json()
            book_ids = data.get('book_ids', [])
            deleted  = []
            failed   = []

            for book_id in book_ids:
                # Find the file matching this id prefix
                matched = [
                    f for f in os.listdir(DOWNLOADED_BOOKS_PATH)
                    if f.startswith(f"{book_id}_") and f.endswith('.epub')
                ]
                if not matched:
                    failed.append(book_id)
                    continue

                try:
                    os.remove(os.path.join(DOWNLOADED_BOOKS_PATH, matched[0]))
                    deleted.append(book_id)
                except Exception as e:
                    self.logger.error(f"Failed to delete book {book_id}: {e}")
                    failed.append(book_id)

            # Return updated downloaded ids after deletion
            return jsonify({
                'deleted':      deleted,
                'failed':       failed,
                'downloaded':   self.get_downloaded_ids(),
            })

        @self.flask_app.route('/upload', methods=['POST'])
        def upload():
            """Upload EPUB file(s)"""
            if 'file' not in request.files:
                return jsonify({'error': 'No file uploaded'}), 400

            files = request.files.getlist('file')
            if not files or files[0].filename == '':
                return jsonify({'error': 'No files selected'}), 400

            uploaded_count = 0
            for file in files:
                if file and file.filename.lower().endswith('.epub'):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(self.books_dir, filename)
                    file.save(filepath)
                    self.logger.info(f"Uploaded: {filename}")
                    uploaded_count += 1

            # Reload library screen to show new books
            self.app_instance.library_screen.load_books(self.books_dir)
            # Refresh the display if on library screen
            if self.app_instance.navigation.current_screen.value == 'library':
                self.app_instance._render_current_screen()

            self.logger.info(f"Uploaded {uploaded_count} book(s)")
            return jsonify({'success': True, 'count': uploaded_count})

     


        @self.flask_app.route('/api/books/stream/<book_id>')
        def stream_book(book_id):
            if mode == "offline":
                # Find the downloaded file and serve it
                for filename in os.listdir(self.books_dir):
                    if filename.startswith(f"{book_id}_"):
                        return send_from_directory(self.books_dir, filename)
                return jsonify({'error': 'Book not downloaded'}), 404

            # Online — proxy directly from Calibre
            try:
                with open(CACHE_PATH) as f:
                    catalog = json.load(f)
                book     = catalog.get(str(book_id))
                epub_url = book.get('main_format', {}).get('epub')
                r = requests.get(
                    f"{CALIBRE_URL}{epub_url}",
                    stream=True,
                    timeout=10
                )
                return Response(
                    r.iter_content(chunk_size=8192),
                    content_type='application/epub+zip',
                    headers={
                        'Content-Disposition': f'inline; filename="{book_id}.epub"'
                    }
                )
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.flask_app.route('/api/progress/list')
        def list_progress():
            """List all saved reading positions"""
            try:
                if not hasattr(self.app_instance, 'progress_manager'):
                    return jsonify({'error': 'Progress manager not available'}), 500

                all_progress = self.app_instance.progress_manager.get_all_progress()
                result = []
                for book_path, progress in all_progress.items():
                    result.append({
                        'path': book_path,
                        'filename': os.path.basename(book_path),
                        'current_page': progress['current_page'] + 1,  # 1-indexed for display
                        'total_pages': progress['total_pages'],
                        'last_read': progress.get('last_read', 'Unknown')
                    })
                # Sort by filename
                result.sort(key=lambda x: x['filename'].lower())
                return jsonify({'progress': result})
            except Exception as e:
                self.logger.error(f"Error listing progress: {e}")
                return jsonify({'error': str(e)}), 500

        @self.flask_app.route('/api/progress/reset', methods=['POST'])
        def reset_progress():
            """Reset reading position for a book or all books"""
            try:
                if not hasattr(self.app_instance, 'progress_manager'):
                    return jsonify({'error': 'Progress manager not available'}), 500

                data = request.get_json() or {}
                book_path = data.get('path')

                if book_path == '__all__':
                    self.app_instance.progress_manager.clear_all_progress()
                    self.logger.info("Reset all reading positions via web interface")
                    return jsonify({'status': 'success', 'message': 'All reading positions reset'})
                elif book_path:
                    self.app_instance.progress_manager.clear_progress(book_path)
                    self.logger.info(f"Reset reading position for {os.path.basename(book_path)} via web interface")
                    return jsonify({'status': 'success', 'message': f'Reset position for {os.path.basename(book_path)}'})
                else:
                    return jsonify({'error': 'No book path provided'}), 400

            except Exception as e:
                self.logger.error(f"Error resetting progress: {e}")
                return jsonify({'error': str(e)}), 500

        @self.flask_app.route('/rename', methods=['POST'])
        def rename():
            """Rename EPUB file"""
            old_name = secure_filename(request.form.get('old_name', ''))
            new_name = secure_filename(request.form.get('new_name', ''))

            if not new_name.endswith('.epub'):
                new_name += '.epub'

            old_path = os.path.join(self.books_dir, old_name)
            new_path = os.path.join(self.books_dir, new_name)

            if os.path.exists(old_path):
                os.rename(old_path, new_path)
                self.logger.info(f"Renamed: {old_name} -> {new_name}")

            return redirect(url_for('index'))

        @self.flask_app.route('/control/<action>')
        def control(action):
            """Remote control actions"""
            if action == 'next':
                self.app_instance._handle_next()
            elif action == 'prev':
                self.app_instance._handle_prev()
            elif action == 'select':
                self.app_instance._handle_select()
            elif action == 'back':
                self.app_instance._handle_back()
            elif action == 'menu':
                self.app_instance._handle_menu()

            return jsonify({'status': 'ok', 'action': action})

        # To-Do List API Routes
        @self.flask_app.route('/api/cpu_voltage')
        def cpu_voltage():
            """Get current CPU voltage"""
            try:
                import subprocess
                result = subprocess.run(
                    ['vcgencmd', 'measure_volts', 'core'],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                if result.returncode == 0:
                    voltage = result.stdout.strip()
                    undervolt_setting = self.app_instance.config.get('power.undervolt', 0)
                    return jsonify({
                        'voltage': voltage,
                        'undervolt_setting': undervolt_setting,
                        'voltage_reduction_mv': abs(undervolt_setting) * 25
                    })
                else:
                    return jsonify({'error': 'Could not read voltage'}), 500
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.flask_app.route('/api/battery_status')
        def battery_status():
            """Get current battery status including charging state"""
            try:
                if self.app_instance.battery_monitor:
                    status = self.app_instance.battery_monitor.get_status()
                    return jsonify(status)
                else:
                    return jsonify({'error': 'Battery monitor not available'}), 503
            except Exception as e:
                return jsonify({'error': str(e)}), 500



        @self.flask_app.route('/reboot')
        def reboot():
            """Reboot the Raspberry Pi"""
            try:
                import subprocess
                self.logger.info("Reboot requested via web interface")
                # Shutdown in 5 seconds to allow response to be sent
                subprocess.Popen(['sudo', 'shutdown', '-r', '+0'])
                return jsonify({'status': 'rebooting'})
            except Exception as e:
                self.logger.error(f"Reboot failed: {e}")
                return jsonify({'error': str(e)}), 500

        @self.flask_app.route('/settings')
        def settings():
            """Settings page"""
            settings_data = self._load_settings('settings.json')
            return render_template_string(SETTINGS_TEMPLATE, settings=settings_data)

        @self.flask_app.route('/save_settings', methods=['POST'])
        def save_settings():
            """Save user settings"""
            try:
                # Get JSON data from request
                data = request.get_json()
                
                # Fetch current settings to use as defaults for missing fields
                current_settings = self.app_instance.settings
                
                settings_data = {
                    'zoom': float(data.get('zoom', current_settings.get('zoom', 1.0))),
                    'full_refresh_interval': int(data.get('full_refresh_interval', current_settings.get('full_refresh_interval', 10))),
                    'show_page_numbers': data.get('show_page_numbers', current_settings.get('show_page_numbers', False)),
                    'wifi_while_reading': data.get('wifi_while_reading', current_settings.get('wifi_while_reading', False)),
                    'sleep_enabled': data.get('sleep_enabled', current_settings.get('sleep_enabled', False)),
                    'sleep_message': data.get('sleep_message', current_settings.get('sleep_message', "Shh I'm sleeping")),
                    'sleep_timeout': int(data.get('sleep_timeout', current_settings.get('sleep_timeout', 120))),
                    'shutdown_message': data.get('shutdown_message', current_settings.get('shutdown_message', 'OFF')),
                    'items_per_page': int(data.get('items_per_page', current_settings.get('items_per_page', 4))),
                    'undervolt': int(data.get('undervolt', current_settings.get('undervolt', -2))),
                    'boot_cores': int(data.get('boot_cores', current_settings.get('boot_cores', 4)))
                }

                self._save_settings(settings_data)
                
                # Force SettingsManager to reload from file so changes take effect immediately
                self.app_instance.settings_manager.settings = self.app_instance.settings_manager.load()
                self.app_instance.settings = self.app_instance.settings_manager.get_all()
                self.logger.info("Settings reloaded in app instance from file")

                # Apply settings to display driver
                self.app_instance.display.set_full_refresh_interval(settings_data['full_refresh_interval'])

                # Always update reader screen's base properties so future books load with them
                self.app_instance.reader_screen.zoom_factor = settings_data['zoom']
                self.app_instance.reader_screen.show_page_numbers = settings_data['show_page_numbers']

                # Apply settings to reader screen if a book is currently open
                if hasattr(self.app_instance.reader_screen, 'renderer') and self.app_instance.reader_screen.renderer:
                    # Reload current book with new settings
                    current_page = self.app_instance.reader_screen.current_page
                    epub_path = self.app_instance.reader_screen.epub_path
                    self.app_instance.reader_screen.close()
                    self.app_instance.reader_screen.load_epub(epub_path, zoom_factor=settings_data['zoom'], dpi=settings_data['dpi'])
                    self.app_instance.reader_screen.current_page = current_page
                    self.app_instance._render_current_screen()
                
                # Update config with WiFi setting
                self.app_instance.config.set('web.always_on', settings_data['wifi_while_reading'])
                
                # Update config with sleep settings
                self.app_instance.config.set('power.sleep_timeout', settings_data['sleep_timeout'])
                self.app_instance.sleep_timeout = settings_data['sleep_timeout']
                self.app_instance.sleep_enabled = settings_data['sleep_enabled']
                # Update library screen to show current sleep status
                self.app_instance.library_screen.sleep_enabled = settings_data['sleep_enabled']

                # Update config with library settings
                self.app_instance.config.set('library.items_per_page', settings_data['items_per_page'])
                self.app_instance.library_screen.items_per_page = settings_data['items_per_page']

                # Update undervolt setting in config (requires reboot to take effect)
                old_undervolt = self.app_instance.config.get('power.undervolt', 0)
                new_undervolt = settings_data['undervolt']
                self.app_instance.config.set('power.undervolt', new_undervolt)

                # Save config changes to disk
                try:
                    self.app_instance.config.save()
                    self.logger.info("Configuration saved to disk")
                except Exception as e:
                    self.logger.error(f"Failed to save config.yaml: {e}")

                # Update /boot/firmware/config.txt if undervolt changed
                undervolt_error = None
                if old_undervolt != new_undervolt:
                    try:
                        self._apply_undervolt(new_undervolt)
                        self.logger.info(f"Undervolt changed from {old_undervolt} to {new_undervolt} - reboot required")
                    except Exception as e:
                        self.logger.error(f"Failed to apply undervolt to boot config: {e}")
                        undervolt_error = str(e)

                # Update /boot/firmware/config.txt if boot_cores changed
                boot_cores_error = None
                old_boot_cores = self.app_instance.config.get('power.boot_cores', 4)
                new_boot_cores = settings_data['boot_cores']
                self.app_instance.config.set('power.boot_cores', new_boot_cores)
                if old_boot_cores != new_boot_cores:
                    try:
                        self._apply_boot_cores(new_boot_cores)
                        self.logger.info(f"Boot cores changed from {old_boot_cores} to {new_boot_cores} - reboot required")
                    except Exception as e:
                        self.logger.error(f"Failed to apply boot_cores to boot config: {e}")
                        boot_cores_error = str(e)

                self.logger.info(f"Settings saved: {settings_data}")

                # Return JSON for AJAX requests, redirect for normal form submission
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.accept_mimetypes.accept_json:
                    result = {'status': 'success', 'message': 'Settings saved successfully'}
                    if undervolt_error:
                        result['undervolt_warning'] = f'Settings saved but undervolt update failed: {undervolt_error}'
                    if boot_cores_error:
                        result['boot_cores_warning'] = f'Settings saved but boot_cores update failed: {boot_cores_error}'
                    return jsonify(result)
                else:
                    return redirect(url_for('settings'))

            except Exception as e:
                self.logger.error(f"Failed to save settings: {e}")
                return jsonify({'error': str(e)}), 400


        # Log Viewing APIs
        @self.flask_app.route('/api/logs/app')
        def view_app_logs():
            """Get recent application logs"""
            try:
                # Default path, although we should prefer config value if accessible cleanly
                log_path = self.app_instance.config.get('logging.file', '/home/pi/PiBook/logs/pibook.log')
                
                if not os.path.exists(log_path):
                    return jsonify({'logs': f"Log file not found at {log_path}", 'type': 'app'})
                
                # Use tail to get last 200 lines efficiently
                import subprocess
                result = subprocess.run(
                    ['tail', '-n', '200', log_path],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    return jsonify({'logs': result.stdout, 'type': 'app'})
                else:
                    return jsonify({'logs': f"Error reading logs: {result.stderr}", 'type': 'app'})
                    
            except Exception as e:
                self.logger.error(f"Failed to read app logs: {e}")
                return jsonify({'error': str(e)}), 500

        @self.flask_app.route('/api/logs/system')
        def view_system_logs():
            """Get recent systemd service logs"""
            try:
                import subprocess
                # Get last 200 lines from journalctl for the pibook service
                result = subprocess.run(
                    ['journalctl', '-u', 'pibook', '-n', '200', '--no-pager'],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0:
                    logs = result.stdout
                    if not logs.strip():
                        logs = "No system logs found for 'pibook' service. Is it running as a service?"
                    return jsonify({'logs': logs, 'type': 'system'})
                else:
                    return jsonify({'logs': f"Error reading system logs: {result.stderr}", 'type': 'system'})
                    
            except Exception as e:
                self.logger.error(f"Failed to read system logs: {e}")
                return jsonify({'error': str(e)}), 500
                
            except subprocess.TimeoutExpired:
                return jsonify({'error': 'Command timed out (30s limit)'}), 408
            except Exception as e:
                self.logger.error(f"Terminal command failed: {e}")
                return jsonify({'error': str(e)}), 500

      

        @self.flask_app.route('/api/system_stats')
        def system_stats():
            """Get comprehensive system statistics"""
            try:
                import subprocess
                import platform
                
                stats = {}
                
                # CPU Temperature
                try:
                    result = subprocess.run(['vcgencmd', 'measure_temp'], capture_output=True, text=True, timeout=2)
                    if result.returncode == 0:
                        stats['cpu_temp'] = result.stdout.strip().replace('temp=', '')
                    else:
                        stats['cpu_temp'] = 'N/A'
                except:
                    stats['cpu_temp'] = 'N/A'

                # CPU Speed
                try:
                    with open('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq', 'r') as f:
                        freq_khz = int(f.read().strip())
                        freq_mhz = freq_khz / 1000
                        stats['cpu_speed'] = f"{freq_mhz:.0f} MHz"
                except:
                    # Fallback to vcgencmd if file not found
                    try:
                        result = subprocess.run(['vcgencmd', 'measure_clock', 'arm'], capture_output=True, text=True, timeout=2)
                        if result.returncode == 0:
                            # Output format: frequency(48)=600000000
                            freq_hz = int(result.stdout.strip().split('=')[1])
                            freq_mhz = freq_hz / 1000000
                            stats['cpu_speed'] = f"{freq_mhz:.0f} MHz"
                        else:
                            stats['cpu_speed'] = 'N/A'
                    except:
                        stats['cpu_speed'] = 'N/A'

                # WiFi Status
                try:
                    result = subprocess.run(['ip', 'link', 'show', 'wlan0'], capture_output=True, text=True, timeout=2)
                    if result.returncode == 0 and ('state UP' in result.stdout or 'UP' in result.stdout):
                        stats['wifi_status'] = 'On'
                    else:
                        stats['wifi_status'] = 'Off'
                except:
                    stats['wifi_status'] = 'Unknown'


                # CPU Voltage
                try:
                    result = subprocess.run(['vcgencmd', 'measure_volts'], capture_output=True, text=True, timeout=2)
                    if result.returncode == 0:
                        stats['cpu_voltage'] = result.stdout.strip()
                    else:
                        stats['cpu_voltage'] = 'N/A'
                except:
                    stats['cpu_voltage'] = 'N/A'
                
                # Undervolt setting from config
                stats['undervolt'] = self.app_instance.config.get('power.undervolt', 0)
                
                # Throttle status
                try:
                    result = subprocess.run(['vcgencmd', 'get_throttled'], capture_output=True, text=True, timeout=2)
                    if result.returncode == 0:
                        throttled = result.stdout.strip().replace('throttled=', '')
                        if throttled == '0x0':
                            stats['throttle_status'] = 'OK'
                            stats['throttle_detail'] = 'No throttling detected'
                        else:
                            stats['throttle_status'] = throttled
                            stats['throttle_detail'] = 'Warning: Throttling detected!'
                    else:
                        stats['throttle_status'] = 'N/A'
                        stats['throttle_detail'] = 'Unable to read'
                except:
                    stats['throttle_status'] = 'N/A'
                    stats['throttle_detail'] = 'Unable to read'
                
                # OS Information
                try:
                    with open('/etc/os-release', 'r') as f:
                        os_info = {}
                        for line in f:
                            if '=' in line:
                                key, value = line.strip().split('=', 1)
                                os_info[key] = value.strip('"')
                        stats['os_name'] = os_info.get('PRETTY_NAME', 'Linux')
                except:
                    stats['os_name'] = platform.system() + ' ' + platform.release()
                
                # System Uptime
                try:
                    with open('/proc/uptime', 'r') as f:
                        uptime_seconds = float(f.read().split()[0])
                        days = int(uptime_seconds // 86400)
                        hours = int((uptime_seconds % 86400) // 3600)
                        minutes = int((uptime_seconds % 3600) // 60)
                        if days > 0:
                            stats['uptime'] = f"{days}d {hours}h {minutes}m"
                        elif hours > 0:
                            stats['uptime'] = f"{hours}h {minutes}m"
                        else:
                            stats['uptime'] = f"{minutes}m"
                except:
                    stats['uptime'] = 'N/A'
                
                # CPU Core Information
                try:
                    # Get total CPU cores
                    with open('/sys/devices/system/cpu/present', 'r') as f:
                        present = f.read().strip()
                        # Format is usually "0-3" for 4 cores
                        if '-' in present:
                            total_cores = int(present.split('-')[1]) + 1
                        else:
                            total_cores = 1
                    
                    # Get online/active CPU cores
                    with open('/sys/devices/system/cpu/online', 'r') as f:
                        online = f.read().strip()
                        # Format can be "0-3" or "0,2-3" etc
                        active_cores = 0
                        for part in online.split(','):
                            if '-' in part:
                                start, end = part.split('-')
                                active_cores += int(end) - int(start) + 1
                            else:
                                active_cores += 1
                    
                    stats['total_cores'] = total_cores
                    stats['active_cores'] = active_cores
                except:
                    stats['total_cores'] = 'N/A'
                    stats['active_cores'] = 'N/A'
                
                # Disk Space
                try:
                    result = subprocess.run(['df', '-h', '/'], capture_output=True, text=True, timeout=2)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        if len(lines) > 1:
                            parts = lines[1].split()
                            if len(parts) >= 4:
                                stats['disk_total'] = parts[1]
                                stats['disk_used'] = parts[2]
                                stats['disk_free'] = parts[3]
                                stats['disk_percent'] = parts[4] if len(parts) > 4 else 'N/A'
                except:
                    stats['disk_free'] = 'N/A'
                
                # Memory Usage
                try:
                    result = subprocess.run(['free', '-h'], capture_output=True, text=True, timeout=2)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        if len(lines) > 1:
                            parts = lines[1].split()
                            if len(parts) >= 3:
                                stats['memory_total'] = parts[1]
                                stats['memory_used'] = parts[2]
                                stats['memory_free'] = parts[3] if len(parts) > 3 else 'N/A'
                                # Calculate percentage
                                try:
                                    total = float(parts[1].replace('Gi', '').replace('Mi', ''))
                                    used = float(parts[2].replace('Gi', '').replace('Mi', ''))
                                    percent = int((used / total) * 100) if total > 0 else 0
                                    stats['memory_percent'] = f"{percent}%"
                                except:
                                    stats['memory_percent'] = 'N/A'
                except:
                    stats['memory_used'] = 'N/A'
                    stats['memory_total'] = 'N/A'
                
                return jsonify(stats)
                
            except Exception as e:
                self.logger.error(f"Failed to get system stats: {e}")
                return jsonify({'error': str(e)}), 500

    def _check_port(self, ip: str, port: int) -> bool:
        """Check if a port is open on the given IP"""
        import socket
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex((ip, port))
            sock.close()
            return result == 0
        except:
            return False



    def _get_books(self):
        """Get list of EPUB files"""
        books = []
        if os.path.exists(self.books_dir):
            for filename in sorted(os.listdir(self.books_dir)):
                if filename.lower().endswith('.epub'):
                    filepath = os.path.join(self.books_dir, filename)
                    size = os.path.getsize(filepath) / (1024 * 1024)  # MB
                    books.append({
                        'filename': filename,
                        'size': f"{size:.2f} MB"
                    })
        return books


    def _load_settings(self, settings_file: str) -> dict:
        """Load settings from file, with defaults from config.yaml"""
        # Start with defaults from config.yaml
        default_settings = {
            'zoom': 1.0,
            'dpi': 150,
            'full_refresh_interval': self.app_instance.config.get('display.full_refresh_interval', 10),
            'show_page_numbers': True,
            'wifi_while_reading': self.app_instance.config.get('web.always_on', False),
            'sleep_enabled': True,
            'sleep_message': 'Shh I\'m sleeping',
            'sleep_timeout': self.app_instance.config.get('power.sleep_timeout', 120),
            'items_per_page': self.app_instance.config.get('library.items_per_page', 4),
            'undervolt': self.app_instance.config.get('power.undervolt', -2),
            'boot_cores': self.app_instance.config.get('power.boot_cores', 4)
        }

        # Override with saved settings if they exist
        if os.path.exists(settings_file):
            try:
                with open(settings_file, 'r') as f:
                    saved_settings = json.load(f)
                    default_settings.update(saved_settings)
                    self.logger.info(f"Loaded settings from {settings_file}")
            except Exception as e:
                self.logger.error(f"Error loading settings: {e}")

        return default_settings

    def _save_settings(self, settings_data):
        """Save settings to settings.json"""
        settings_file = 'settings.json'
        try:
            with open(settings_file, 'w') as f:
                json.dump(settings_data, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save settings: {e}")
            raise

    def _apply_undervolt(self, undervolt_value):
        """Apply undervolt setting to /boot/firmware/config.txt using sudo helper script"""
        try:
            import subprocess
            script_path = '/home/pi/PiBook/scripts/apply_undervolt.sh'

            # Use sudo to run the helper script
            result = subprocess.run(
                ['sudo', script_path, str(undervolt_value)],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                self.logger.info(f"Successfully applied undervolt={undervolt_value} via helper script")
                self.logger.info(result.stdout.strip())
            else:
                self.logger.error(f"Failed to apply undervolt: {result.stderr}")
                raise Exception(f"Helper script failed: {result.stderr}")

        except subprocess.TimeoutExpired:
            self.logger.error("Timeout applying undervolt setting")
            raise
        except Exception as e:
            self.logger.error(f"Failed to apply undervolt: {e}")
            raise

    def _apply_boot_cores(self, num_cores):
        """Apply boot CPU cores setting via maxcpus in /boot/firmware/cmdline.txt using sudo helper script"""
        try:
            import subprocess
            script_path = '/home/pi/PiBook/scripts/apply_cpu_cores.sh'

            # Use sudo to run the helper script
            result = subprocess.run(
                ['sudo', script_path, str(num_cores)],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                self.logger.info(f"Successfully applied boot_cores={num_cores} via helper script")
                self.logger.info(result.stdout.strip())
            else:
                self.logger.error(f"Failed to apply boot_cores: {result.stderr}")
                raise Exception(f"Helper script failed: {result.stderr}")

        except subprocess.TimeoutExpired:
            self.logger.error("Timeout applying boot_cores setting")
            raise
        except Exception as e:
            self.logger.error(f"Failed to apply boot_cores: {e}")
            raise

    def run(self):
        """Start the web server in a separate thread"""
        import threading
        thread = threading.Thread(target=self._run_server, daemon=True)
        thread.start()
        self.logger.info(f"Web server started on port {self.port}")

    def _run_server(self):
        """Internal method to run Flask server"""
        self.flask_app.run(host='0.0.0.0', port=self.port, debug=False, use_reloader=False)

