const API_URL = '/api';

let accessToken = localStorage.getItem('access_token');
let refreshToken = localStorage.getItem('refresh_token');

async function apiRequest(endpoint, method = 'GET', data = null, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const config = { method, headers };
    if (data) config.body = JSON.stringify(data);
    
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    if (response.status === 401 && auth) {
        const refreshed = await refreshAccessToken();
        if (refreshed) return apiRequest(endpoint, method, data, auth);
        logout();
        throw new Error('Сессия истекла');
    }
    return response;
}

async function refreshAccessToken() {
    if (!refreshToken) return false;
    try {
        const response = await fetch(`${API_URL}/auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });
        if (response.ok) {
            const data = await response.json();
            accessToken = data.access;
            localStorage.setItem('access_token', accessToken);
            return true;
        }
    } catch (e) {}
    return false;
}

function setAuthTokens(access, refresh) {
    accessToken = access;
    refreshToken = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
}

function logout() {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    updateUIForAuth(false);
    showHome();
}

function updateUIForAuth(isAuthenticated) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const appointmentsBtn = document.getElementById('appointmentsBtn');
    const medicalRecordBtn = document.getElementById('medicalRecordBtn');
    const profileBtn = document.getElementById('profileBtn');
    
    if (isAuthenticated && accessToken) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        
        fetch(`${API_URL}/auth/me/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(response => response.json())
        .then(user => {
            localStorage.setItem('user_role', user.role);
            localStorage.setItem('user_name', `${user.first_name} ${user.last_name}`);
            userName.textContent = `${user.first_name} ${user.last_name}`;
            
            if (user.role === 'doctor') {
                if (appointmentsBtn) {
                    appointmentsBtn.textContent = 'Мои пациенты';
                    appointmentsBtn.onclick = () => showDoctorPanel();
                }
                if (medicalRecordBtn) medicalRecordBtn.style.display = 'none';
            } else if (user.role === 'patient') {
                if (appointmentsBtn) {
                    appointmentsBtn.textContent = 'Мои записи';
                    appointmentsBtn.onclick = () => showMyAppointments();
                }
                if (medicalRecordBtn) medicalRecordBtn.style.display = 'block';
            } else if (user.role === 'admin') {
                if (appointmentsBtn) {
                    appointmentsBtn.textContent = 'Админка';
                    appointmentsBtn.onclick = () => window.open('/admin/', '_blank');
                }
                if (medicalRecordBtn) medicalRecordBtn.style.display = 'none';
            }
        })
        .catch(e => {
            console.error('Failed to load user info:', e);
            logout();
        });
    } else {
        authButtons.style.display = 'block';
        userMenu.style.display = 'none';
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
    }
}

async function loadUserInfo() {
    try {
        const response = await apiRequest('/auth/me/');
        if (response.ok) {
            const user = await response.json();
            document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
            return user;
        }
    } catch (e) {
        console.error('Load user info error:', e);
    }
    return null;
}

async function showHome() {
    const userRole = localStorage.getItem('user_role');
    
    if (userRole === 'doctor') {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="card">
                <h2>👨‍⚕️ Добро пожаловать!</h2>
                <p>Используйте кнопку "Мои пациенты" для работы с записями.</p>
            </div>
        `;
        return;
    }
    
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <h2>Выберите специальность врача</h2>
            <div id="specialtiesList">Загрузка...</div>
        </div>
    `;
    await loadSpecialties();
}

async function loadSpecialties() {
    const specialtiesDiv = document.getElementById('specialtiesList');
    try {
        const response = await apiRequest('/doctors/specialties/', 'GET', null, false);
        if (response.ok) {
            const data = await response.json();
            const specialties = data.results || data;
            if (specialties.length > 0) {
                specialtiesDiv.innerHTML = specialties.map(s => `
                    <div class="specialty-card" onclick="showDoctorsBySpecialty(${s.id}, '${s.name}')">
                        <h3>🏷️ ${s.name}</h3>
                        <p>${s.description || 'Выберите врача этой специальности'}</p>
                    </div>
                `).join('');
            } else {
                specialtiesDiv.innerHTML = '<p>Нет специальностей в базе</p>';
            }
        }
    } catch (e) {
        specialtiesDiv.innerHTML = '<p>Ошибка загрузки</p>';
    }
}

window.showDoctorsBySpecialty = async function(specialtyId, specialtyName) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <button onclick="showHome()" class="back-btn">← Назад</button>
            <h2>${specialtyName}</h2>
            <div id="doctorsList">Загрузка...</div>
        </div>
    `;
    
    try {
        const response = await apiRequest(`/doctors/profiles/?specialty=${specialtyId}`, 'GET', null, false);
        if (response.ok) {
            const data = await response.json();
            const doctors = data.results || data;
            if (doctors.length > 0) {
                document.getElementById('doctorsList').innerHTML = doctors.map(d => `
                    <div class="doctor-card" onclick="showDoctorSchedule(${d.id}, '${d.user?.last_name} ${d.user?.first_name}', '${d.specialty_name}')">
                        <h4>👨‍⚕️ ${d.user?.last_name} ${d.user?.first_name}</h4>
                        <p>🏢 Кабинет: ${d.cabinet}</p>
                        <p>📅 Стаж: ${d.experience} лет</p>
                        <p>⏱️ Приём: ${d.slot_duration || 20} минут</p>
                    </div>
                `).join('');
            } else {
                document.getElementById('doctorsList').innerHTML = '<p>Нет врачей этой специальности</p>';
            }
        }
    } catch (e) {
        document.getElementById('doctorsList').innerHTML = '<p>Ошибка загрузки</p>';
    }
};

window.showDoctorSchedule = function(doctorId, doctorName, specialtyName) {
    if (!accessToken) {
        alert('Необходимо войти в систему для записи');
        showLoginForm();
        return;
    }
    
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);
    
    const todayStr = today.toISOString().split('T')[0];
    const maxDateStr = maxDate.toISOString().split('T')[0];
    
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <button onclick="showDoctorsBySpecialty(null, '${specialtyName}')" class="back-btn">← Назад</button>
            <h2>👨‍⚕️ ${doctorName}</h2>
            <p>🏷️ ${specialtyName}</p>
            <div class="form-group">
                <label>Выберите дату</label>
                <input type="date" id="datePicker" min="${todayStr}" max="${maxDateStr}">
            </div>
            <div id="timeSlots" style="margin-top: 20px;">
                <p>Выберите дату, чтобы увидеть свободное время</p>
            </div>
            <div id="appointmentError" class="error"></div>
        </div>
    `;
    
    const datePicker = document.getElementById('datePicker');
    
    datePicker.addEventListener('change', async (e) => {
        const selectedDate = e.target.value;
        if (!selectedDate) return;
        
        const timeSlotsDiv = document.getElementById('timeSlots');
        timeSlotsDiv.innerHTML = '<p>Загрузка...</p>';
        
        try {
            const url = `${API_URL}/appointments/available-slots/?doctor_id=${doctorId}&date=${selectedDate}`;
            const response = await fetch(url, {
                headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
            });
            
            if (response.ok) {
                const data = await response.json();
                const freeSlots = data.free_slots || [];
                const slotDuration = data.slot_duration || 20;
                
                if (freeSlots.length > 0) {
                    timeSlotsDiv.innerHTML = `
                        <h3>Доступное время (приём ${slotDuration} мин):</h3>
                        <div class="slots-container">
                            ${freeSlots.map(slot => `
                                <button class="time-slot" onclick="showReasonForm(${doctorId}, '${selectedDate} ${slot}:00', '${doctorName}', '${specialtyName}', '${slot}')">${slot}</button>
                            `).join('')}
                        </div>
                    `;
                } else {
                    timeSlotsDiv.innerHTML = '<p class="error">Нет свободного времени на эту дату</p>';
                }
            } else {
                timeSlotsDiv.innerHTML = '<p class="error">Ошибка загрузки расписания</p>';
            }
        } catch (e) {
            console.error('Error:', e);
            timeSlotsDiv.innerHTML = '<p class="error">Ошибка соединения</p>';
        }
    });
};


window.showReasonForm = function(doctorId, datetime, doctorName, specialtyName, timeSlot) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <button onclick="showDoctorSchedule(${doctorId}, '${doctorName}', '${specialtyName}')" class="back-btn">← Назад</button>
            <h2>Запись к ${doctorName}</h2>
            <p>📅 Дата: ${datetime.split(' ')[0]}</p>
            <p>⏰ Время: ${timeSlot}</p>
            <div class="form-group">
                <label>Причина обращения (необязательно)</label>
                <textarea id="reason" rows="4" placeholder="Опишите причину обращения..."></textarea>
            </div>
            <button id="confirmAppointmentBtn" type="submit" class="submit-btn">Подтвердить запись</button>
            <div id="appointmentError" class="error"></div>
        </div>
    `;
    
    document.getElementById('confirmAppointmentBtn').addEventListener('click', async () => {
        const reason = document.getElementById('reason').value;
        
        const datetimeISO = new Date(datetime).toISOString();
        
        try {
            const response = await apiRequest('/appointments/appointments/', 'POST', {
                doctor: doctorId,
                datetime: datetimeISO,
                reason: reason || ''  
            });
            
            if (response.ok) {
                alert(`✅ Запись к ${doctorName} на ${datetime.split(' ')[0]} в ${timeSlot} успешно создана!`);
                showMyAppointments();
            } else {
                const error = await response.json();
                let errorMsg = error.datetime?.[0] || error.detail || 'Не удалось создать запись';
                if (errorMsg.includes('уже занято')) {
                    errorMsg = '❌ Это время уже занято. Пожалуйста, выберите другое время.';
                }
                document.getElementById('appointmentError').textContent = errorMsg;
            }
        } catch (e) {
            console.error('Error:', e);
            document.getElementById('appointmentError').textContent = 'Ошибка соединения';
        }
    });
};

window.createAppointment = async function(doctorId, datetime, doctorName, specialtyName) {
    const datetimeISO = new Date(datetime).toISOString();
    
    const reason = prompt('Укажите причину обращения (необязательно):');
    
    try {
        const response = await apiRequest('/appointments/appointments/', 'POST', {
            doctor: doctorId,
            datetime: datetimeISO,
            reason: reason || ''
        });
        
        if (response.ok) {
            alert(`✅ Запись к ${doctorName} на ${datetime} успешно создана!`);
            showMyAppointments();
        } else {
            const error = await response.json();
            alert('❌ Ошибка: ' + (error.datetime?.[0] || error.detail || 'Не удалось создать запись'));
        }
    } catch (e) {
        alert('❌ Ошибка соединения');
    }
};

async function showMyAppointments() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="card"><h2>📅 Мои записи</h2><div id="appointmentsList">Загрузка...</div></div>`;
    
    try {
        const response = await apiRequest('/appointments/appointments/');
        if (response.ok) {
            const data = await response.json();
            const appointments = data.results || data;
            
            const now = new Date();
            
            const activeAppointments = appointments.filter(a => {
                const appointmentDate = new Date(a.datetime);
                return a.status === 'active' && appointmentDate > now;
            });
            
            const completedAppointments = appointments.filter(a => {
                const appointmentDate = new Date(a.datetime);
                return a.status === 'completed' || a.status === 'cancelled' || (a.status === 'active' && appointmentDate <= now);
            });
            
            activeAppointments.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            completedAppointments.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            
            let activeHtml = '';
            let completedHtml = '';
            
            if (activeAppointments.length > 0) {
                activeHtml = `
                    <table class="appointments-table">
                        <thead>
                            <tr><th>Врач</th><th>Специальность</th><th>Дата и время</th><th>Причина</th><th>Действие</th></tr>
                        </thead>
                        <tbody>
                            ${activeAppointments.map(a => `
                                <tr>
                                    <td>${a.doctor_name || ''}</td>
                                    <td>${a.doctor_specialty || ''}</td>
                                    <td>${new Date(a.datetime).toLocaleString()}</td>
                                    <td>${a.reason || '-'}</td>
                                    <td><button class="btn-danger" onclick="cancelAppointment(${a.id})">Отменить</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                activeHtml = '<p>Нет активных записей</p>';
            }
            
            if (completedAppointments.length > 0) {
                completedHtml = `
                    <table class="appointments-table">
                        <thead>
                            <tr><th>Врач</th><th>Специальность</th><th>Дата и время</th><th>Статус</th><th>Причина</th></tr>
                        </thead>
                        <tbody>
                            ${completedAppointments.map(a => {
                                const appointmentDate = new Date(a.datetime);
                                let statusText = '';
                                if (a.status === 'completed') statusText = 'Завершён';
                                else if (a.status === 'cancelled') statusText = 'Отменён';
                                else if (a.status === 'active' && appointmentDate <= now) statusText = 'Просрочен';
                                else statusText = a.status;
                                return `
                                    <tr class="past-appointment">
                                        <td>${a.doctor_name || ''}</td>
                                        <td>${a.doctor_specialty || ''}</td>
                                        <td>${appointmentDate.toLocaleString()}</td>
                                        <td>${statusText}</td>
                                        <td>${a.reason || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                completedHtml = '<p>Нет завершённых записей</p>';
            }
            
            app.innerHTML = `
                <div class="card">
                    <h2>📅 Мои записи</h2>
                    
                    <h3>📋 Активные записи (${activeAppointments.length})</h3>
                    ${activeHtml}
                    
                    <h3>✅ Завершённые приёмы (${completedAppointments.length})</h3>
                    ${completedHtml}
                </div>
            `;
        }
    } catch (e) {
        console.error('Error:', e);
        app.innerHTML = '<div class="card"><p>Ошибка загрузки</p></div>';
    }
}

window.cancelAppointment = async function(appointmentId) {
    if (confirm('Отменить запись?')) {
        const response = await apiRequest(`/appointments/appointments/${appointmentId}/cancel/`, 'PATCH');
        if (response.ok) {
            alert('Запись отменена');
            showMyAppointments();
        } else {
            alert('Ошибка отмены');
        }
    }
};

function showLoginForm() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <h2>Вход в систему</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label>Имя пользователя</label>
                    <input type="text" id="username" required>
                </div>
                <div class="form-group">
                    <label>Пароль</label>
                    <input type="password" id="password" required>
                </div>
                <button type="submit">Войти</button>
                <div id="loginError" class="error"></div>
            </form>
        </div>
    `;
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const loginError = document.getElementById('loginError');
        loginError.textContent = '';
        
        try {
            const response = await fetch(`${API_URL}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                setAuthTokens(data.access, data.refresh);
                
                const userResponse = await fetch(`${API_URL}/auth/me/`, {
                    headers: { 'Authorization': `Bearer ${data.access}` }
                });
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    localStorage.setItem('user_role', userData.role);
                    localStorage.setItem('user_name', `${userData.first_name} ${userData.last_name}`);
                }
                
                updateUIForAuth(true);
                showHome();
            } else {
                const error = await response.json();
                loginError.textContent = error.detail || 'Неверное имя пользователя или пароль';
            }
        } catch (e) {
            console.error('Login error:', e);
            loginError.textContent = 'Ошибка соединения с сервером. Попробуйте позже.';
        }
    });
}

function showRegisterForm() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <h2>Регистрация</h2>
            <form id="registerForm">
                <div class="form-group"><label>Имя пользователя</label><input type="text" id="username" required></div>
                <div class="form-group"><label>Email</label><input type="email" id="email" required></div>
                <div class="form-group"><label>Фамилия</label><input type="text" id="last_name" required></div>
                <div class="form-group"><label>Имя</label><input type="text" id="first_name" required></div>
                <div class="form-group"><label>Отчество</label><input type="text" id="middle_name"></div>
                <div class="form-group"><label>Телефон</label><input type="text" id="phone"></div>
                <div class="form-group"><label>Пароль</label><input type="password" id="password" required></div>
                <div class="form-group"><label>Подтверждение</label><input type="password" id="password2" required></div>
                <button type="submit">Зарегистрироваться</button>
                <div id="registerError" class="error"></div>
            </form>
        </div>
    `;
    
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            first_name: document.getElementById('first_name').value,
            last_name: document.getElementById('last_name').value,
            middle_name: document.getElementById('middle_name').value,
            phone: document.getElementById('phone').value,
            password: document.getElementById('password').value,
            password2: document.getElementById('password2').value,
            role: 'patient'
        };
        
        try {
            const response = await fetch(`${API_URL}/auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                alert('Регистрация успешна! Теперь войдите в систему.');
                showLoginForm();
            } else {
                const error = await response.json();
                let msg = '';
                if (error.password) msg = error.password[0];
                else if (error.username) msg = error.username[0];
                else if (error.email) msg = error.email[0];
                else msg = JSON.stringify(error);
                document.getElementById('registerError').textContent = msg;
            }
        } catch (e) {
            document.getElementById('registerError').textContent = 'Ошибка соединения';
        }
    });
}

async function loadSpecialtiesOptions(selectedId) {
    try {
        const response = await apiRequest('/doctors/specialties/', 'GET', null, false);
        if (response.ok) {
            const data = await response.json();
            const specialties = data.results || data;
            let options = '<option value="">-- Выберите --</option>';
            specialties.forEach(s => {
                const selected = selectedId == s.id ? 'selected' : '';
                options += `<option value="${s.id}" ${selected}>${s.name}</option>`;
            });
            return options;
        }
    } catch (e) {
        console.error('Error loading specialties:', e);
    }
    return '<option value="">-- Ошибка загрузки --</option>';
}

async function showProfile() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="card"><h2>Мой профиль</h2><div id="profileContent">Загрузка...</div></div>`;
    
    try {
        const response = await apiRequest('/auth/me/');
        if (response.ok) {
            const user = await response.json();
            const isDoctor = user.role === 'doctor';
            
            let doctorInfoHtml = '';
            if (isDoctor) {
                try {
                    const doctorResponse = await apiRequest(`/doctors/profiles/?user_id=${user.id}`);
                    if (doctorResponse.ok) {
                        const doctorData = await doctorResponse.json();
                        const doctor = doctorData.results?.[0] || doctorData;
                        if (doctor) {
                            doctorInfoHtml = `
                                <div class="doctor-info">
                                    <div class="form-group">
                                        <label>Специальность</label>
                                        <input type="text" value="${doctor.specialty_name || '-'}" disabled>
                                    </div>
                                    <div class="form-group">
                                        <label>Стаж (лет)</label>
                                        <input type="text" value="${doctor.experience || 0}" disabled>
                                    </div>
                                    <div class="form-group">
                                        <label>Кабинет</label>
                                        <input type="text" value="${doctor.cabinet || '-'}" disabled>
                                    </div>
                                    <div class="form-group">
                                        <label>Длительность приёма (мин)</label>
                                        <input type="text" value="${doctor.slot_duration || 20}" disabled>
                                    </div>
                                </div>
                            `;
                        }
                    } else {
                        console.error('Failed to load doctor profile');
                    }
                } catch (e) {
                    console.error('Error loading doctor profile:', e);
                }
            }
            
            app.innerHTML = `
                <div class="card">
                    <h2>Мой профиль</h2>
                    <form id="profileForm">
                        <div class="form-group">
                            <label>Имя пользователя</label>
                            <input type="text" id="username" value="${user.username || ''}">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="email" value="${user.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>Фамилия</label>
                            <input type="text" id="last_name" value="${user.last_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>Имя</label>
                            <input type="text" id="first_name" value="${user.first_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>Отчество</label>
                            <input type="text" id="middle_name" value="${user.middle_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>Телефон</label>
                            <input type="text" id="phone" value="${user.phone || ''}">
                        </div>
                        ${doctorInfoHtml}
                        <button type="submit" class="submit-btn">Сохранить изменения</button>
                        <div id="profileError" class="error"></div>
                    </form>
                </div>
            `;
            
            if (!isDoctor) {
                document.getElementById('profileForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('email').value;
                    if (!email) {
                        document.getElementById('profileError').textContent = 'Email обязателен';
                        return;
                    }
                    
                    const updateData = {
                        email: email,
                        first_name: document.getElementById('first_name').value,
                        last_name: document.getElementById('last_name').value,
                        middle_name: document.getElementById('middle_name').value,
                        phone: document.getElementById('phone').value,
                    };
                    
                    try {
                        const response = await apiRequest('/auth/me/', 'PATCH', updateData);
                        if (response.ok) {
                            alert('Профиль обновлён');
                            loadUserInfo();
                        } else {
                            const error = await response.json();
                            document.getElementById('profileError').textContent = error.email?.[0] || error.detail || 'Ошибка сохранения';
                        }
                    } catch (e) {
                        document.getElementById('profileError').textContent = 'Ошибка соединения';
                    }
                });
            }
        } else {
            app.innerHTML = '<div class="card"><p>Ошибка загрузки профиля</p></div>';
        }
    } catch (e) {
        console.error('Profile error:', e);
        app.innerHTML = '<div class="card"><p>Ошибка загрузки профиля</p></div>';
    }
}

async function showDoctorPanel() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="card"><h2>👨‍⚕️ Врачебная панель</h2><div id="doctorContent">Загрузка...</div></div>`;
    
    try {
        const response = await apiRequest('/appointments/appointments/');
        if (response.ok) {
            const data = await response.json();
            const appointments = data.results || data;
            
            const now = new Date();
            
            const activeAppointments = appointments.filter(a => {
                const appointmentDate = new Date(a.datetime);
                return a.status === 'active' && appointmentDate > now;
            });
            
            const completedAppointments = appointments.filter(a => {
                const appointmentDate = new Date(a.datetime);
                return a.status === 'completed' || (a.status === 'active' && appointmentDate <= now);
            });
            
            activeAppointments.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            completedAppointments.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            
            let activeHtml = '';
            let completedHtml = '';
            
            if (activeAppointments.length > 0) {
                activeHtml = `
                    <table class="appointments-table">
                        <thead>
                            <tr>
                                <th>Пациент</th>
                                <th>Дата и время</th>
                                <th>Телефон</th>
                                <th>Причина</th>
                                <th>Действие</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeAppointments.map(a => `
                                <tr>
                                    <td><strong>${a.patient_name || a.patient}</strong></td>
                                    <td>${new Date(a.datetime).toLocaleString()}</td>
                                    <td>${a.patient_phone || '-'}</td>
                                    <td>${a.reason || '-'}</td>
                                    <td>
                                        <button class="btn-success" onclick="showMedicalRecordForm(${a.id}, ${a.patient}, '${a.patient_name}')">Принять пациента</button>
                                        <button class="btn-danger" onclick="cancelAppointment(${a.id})">❌ Отменить</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                activeHtml = '<p>Нет активных записей</p>';
            }
            
            if (completedAppointments.length > 0) {
                completedHtml = `
                    <table class="appointments-table">
                        <thead>
                            <tr>
                                <th>Пациент</th>
                                <th>Дата и время</th>
                                <th>Причина</th>
                                <th>Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${completedAppointments.map(a => {
                                const appointmentDate = new Date(a.datetime);
                                let statusText = a.status === 'completed' ? 'Завершён' : 'Просрочен';
                                return `
                                    <tr class="past-appointment">
                                        <td>${a.patient_name || a.patient}</td>
                                        <td>${appointmentDate.toLocaleString()}</td>
                                        <td>${a.reason || '-'}</td>
                                        <td>${statusText}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                completedHtml = '<p>Нет завершённых приёмов</p>';
            }
            
            app.innerHTML = `
                <div class="card">
                    <h2>👨‍⚕️ Врачебная панель</h2>
                    
                    <h3>📋 Активные записи (${activeAppointments.length})</h3>
                    ${activeHtml}
                    
                    <h3>✅ Завершённые приёмы (${completedAppointments.length})</h3>
                    ${completedHtml}
                </div>
            `;
        }
    } catch (e) {
        console.error('Error:', e);
        app.innerHTML = '<div class="card"><p>Ошибка загрузки</p></div>';
    }
}

window.showMedicalRecordForm = async function(appointmentId, patientId, patientName) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <button onclick="showDoctorPanel()" class="back-btn">← Назад</button>
            <h2>📝 Создание записи в медицинской карте</h2>
            <p>Пациент: <strong>${patientName}</strong></p>
            <form id="medicalRecordForm">
                <div class="form-group">
                    <label>Жалобы *</label>
                    <textarea id="complaints" rows="3" required></textarea>
                </div>
                <div class="form-group">
                    <label>Диагноз *</label>
                    <input type="text" id="diagnosis" required>
                </div>
                <div class="form-group">
                    <label>Назначения</label>
                    <textarea id="prescription" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>Рекомендации</label>
                    <textarea id="recommendations" rows="2"></textarea>
                </div>
                <button type="submit" class="submit-btn">Сохранить и завершить приём</button>
                <div id="medicalRecordError" class="error"></div>
            </form>
        </div>
    `;
    
    document.getElementById('medicalRecordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const complaints = document.getElementById('complaints').value;
        const diagnosis = document.getElementById('diagnosis').value;
        const prescription = document.getElementById('prescription').value;
        const recommendations = document.getElementById('recommendations').value;
        
        if (!complaints || !diagnosis) {
            document.getElementById('medicalRecordError').textContent = 'Жалобы и диагноз обязательны';
            return;
        }
        
        try {
            const response = await apiRequest('/medical_records/create-from-appointment/', 'POST', {
                appointment_id: appointmentId,
                complaints: complaints,
                diagnosis: diagnosis,
                prescription: prescription,
                recommendations: recommendations
            });
            
            if (response.ok) {
                alert(`✅ Приём завершён, медицинская карта пациента ${patientName} обновлена`);
                showDoctorPanel();
            } else {
                const error = await response.json();
                document.getElementById('medicalRecordError').textContent = error.error || 'Ошибка при сохранении';
            }
        } catch (e) {
            console.error('Error:', e);
            document.getElementById('medicalRecordError').textContent = 'Ошибка соединения';
        }
    });
};

window.markVisited = async function(appointmentId, patientId) {
    const complaints = prompt('Жалобы пациента:');
    const diagnosis = prompt('Диагноз:');
    const prescription = prompt('Назначения (необязательно):');
    const recommendations = prompt('Рекомендации (необязательно):');
    
    if (!complaints || !diagnosis) {
        alert('Жалобы и диагноз обязательны для заполнения');
        return;
    }
    
    try {
        const completeResponse = await apiRequest(`/appointments/appointments/${appointmentId}/complete/`, 'PATCH');
        if (completeResponse.ok) {
            const visitResponse = await apiRequest(`/appointments/visits/?appointment=${appointmentId}`);
            let visitId = null;
            if (visitResponse.ok) {
                const visits = await visitResponse.json();
                if (visits.results && visits.results.length > 0) {
                    visitId = visits.results[0].id;
                }
            }
            
            if (visitId) {
                const recordResponse = await apiRequest('/medical_records/records/', 'POST', {
                    visit: visitId,
                    visit_date: new Date().toISOString(),
                    complaints: complaints,
                    diagnosis: diagnosis,
                    prescription: prescription || '',
                    recommendations: recommendations || ''
                });
                
                if (recordResponse.ok) {
                    alert('✅ Приём завершён, запись добавлена в медицинскую карту');
                    showDoctorPanel();
                } else {
                    alert('⚠️ Приём завершён, но ошибка при сохранении медицинской карты');
                }
            } else {
                alert('⚠️ Приём завершён, но не найдено посещение');
            }
        } else {
            alert('❌ Ошибка при завершении приёма');
        }
    } catch (e) {
        alert('Ошибка соединения');
    }
};

async function showMedicalRecord() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="card"><h2>📋 Моя медицинская карта</h2><div id="medicalRecordContent">Загрузка...</div></div>`;
    
    try {
        const response = await apiRequest('/medical_records/records/');
        if (response.ok) {
            const data = await response.json();
            const records = data.results || data;
            
            records.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
            
            if (records.length > 0) {
                let recordsHtml = `
                    <table class="medical-records-table">
                        <thead>
                            <tr>
                                <th>Дата и время</th>
                                <th>Врач</th>
                                <th>Специальность</th>
                                <th>Диагноз</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                for (const r of records) {
                    const visitDate = new Date(r.visit_date);
                    const dateTimeStr = visitDate.toLocaleString();
                    
                    recordsHtml += `
                        <tr id="record-row-${r.id}">
                            <td>${dateTimeStr}</td>
                            <td>${r.doctor_name || r.doctor}</td>
                            <td>${r.doctor_specialty || '-'}</td>
                            <td>${r.diagnosis.substring(0, 50)}${r.diagnosis.length > 50 ? '...' : ''}</td>
                            <td><button class="detail-btn" onclick="toggleRecordDetails(${r.id})">Подробнее</button></td>
                        </tr>
                        <tr id="details-row-${r.id}" style="display: none;">
                            <td colspan="5" style="padding: 0;">
                                <div class="record-details">
                                    <p><strong>Жалобы:</strong> ${r.complaints}</p>
                                    <p><strong>Диагноз:</strong> ${r.diagnosis}</p>
                                    <p><strong>Назначения:</strong> ${r.prescription || '-'}</p>
                                    <p><strong>Рекомендации:</strong> ${r.recommendations || '-'}</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
                
                recordsHtml += `
                        </tbody>
                    </table>
                `;
                
                app.innerHTML = `
                    <div class="card">
                        <h2>📋 Моя медицинская карта</h2>
                        ${recordsHtml}
                    </div>
                `;
            } else {
                app.innerHTML = '<div class="card"><h2>📋 Моя медицинская карта</h2><p>Нет записей в медицинской карте</p></div>';
            }
        }
    } catch (e) {
        console.error('Error:', e);
        app.innerHTML = '<div class="card"><p>Ошибка загрузки медицинской карты</p></div>';
    }
}

window.toggleRecordDetails = function(recordId) {
    const detailsRow = document.getElementById(`details-row-${recordId}`);
    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
    } else {
        detailsRow.style.display = 'none';
    }
};

document.getElementById('homeBtn').addEventListener('click', () => showHome());
document.getElementById('loginBtn').addEventListener('click', () => showLoginForm());
document.getElementById('registerBtn').addEventListener('click', () => showRegisterForm());
document.getElementById('logoutBtn').addEventListener('click', () => logout());
document.getElementById('profileBtn').addEventListener('click', () => showProfile());
document.getElementById('medicalRecordBtn').addEventListener('click', () => showMedicalRecord());
const appointmentsBtn = document.getElementById('appointmentsBtn');
if (appointmentsBtn) appointmentsBtn.addEventListener('click', () => showMyAppointments());

if (accessToken) updateUIForAuth(true);
else updateUIForAuth(false);
showHome();