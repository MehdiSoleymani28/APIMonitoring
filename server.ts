import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { performance } from 'perf_hooks';
import { Group, Service, CheckHistory, Alert, MockEndpoint } from './src/types.js';

// Deep relative path or standard resolver
const DB_FILE = path.join(process.cwd(), 'db.json');

// Interface for our database structure
interface DatabaseSchema {
  groups: Group[];
  services: Service[];
  alerts: Alert[];
  history: CheckHistory[];
  mockEndpoints: MockEndpoint[];
}

// Initial/default seed data
const DEFAULT_DB: DatabaseSchema = {
  groups: [
    {
      id: 'g1',
      name: 'وب‌سرویس‌های بخش مالی (Financial APIs)',
      token: 'finance_sec_token_99x88',
      tokenUpdatedAt: new Date().toISOString()
    },
    {
      id: 'g2',
      name: 'سامانه مدیریت کاربران (User Auth microservices)',
      token: 'users_sec_token_33y22',
      tokenUpdatedAt: new Date().toISOString()
    }
  ],
  services: [
    {
      id: 's1',
      groupId: 'g1',
      name: 'بررسی سلامت وب‌سرویس صندوق بانکی',
      url: 'http://localhost:3000/api/mock/finance/status',
      method: 'GET',
      headers: [{ key: 'Authorization', value: 'Bearer {TOKEN}' }],
      body: '',
      monitorField: 'vault_status',
      expectedValue: 'operational',
      checkInterval: 5,
      responseTimeThreshold: 300,
      status: 'UP',
      lastChecked: new Date().toISOString(),
      monitorType: 'FIELD_MATCH'
    },
    {
      id: 's2',
      groupId: 'g2',
      name: 'کنترل صحت پایگاه داده کاربران',
      url: 'http://localhost:3000/api/mock/users/health',
      method: 'GET',
      headers: [
        { key: 'Authorization', value: 'Bearer {TOKEN}' },
        { key: 'X-App-Id', value: 'monitor-agent' }
      ],
      body: '',
      monitorField: 'db_connection',
      expectedValue: 'connected',
      checkInterval: 10,
      responseTimeThreshold: 150,
      status: 'UP',
      lastChecked: new Date().toISOString(),
      monitorType: 'FIELD_MATCH'
    }
  ],
  alerts: [],
  history: [],
  mockEndpoints: [
    {
      id: 'm1',
      path: 'finance/status',
      status: 200,
      responseTimeDelay: 120,
      responseBody: JSON.stringify({
        status: 'active',
        vault_status: 'operational',
        last_sync: 'just_now',
        server_load: '12%'
      }, null, 2)
    },
    {
      id: 'm2',
      path: 'users/health',
      status: 200,
      responseTimeDelay: 85,
      responseBody: JSON.stringify({
        api_status: 'healthy',
        db_connection: 'connected',
        active_sessions_count: 512,
        cached_keys: true
      }, null, 2)
    }
  ]
};

// State container
let db: DatabaseSchema = { ...DEFAULT_DB };

// Load database from file if exists
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      db = {
        groups: parsed.groups || DEFAULT_DB.groups,
        services: parsed.services || DEFAULT_DB.services,
        alerts: parsed.alerts || DEFAULT_DB.alerts,
        history: parsed.history || DEFAULT_DB.history,
        mockEndpoints: parsed.mockEndpoints || DEFAULT_DB.mockEndpoints
      };
      console.log('Database loaded successfully from', DB_FILE);
    } else {
      saveDb();
    }
  } catch (err) {
    console.error('Error loading database, resetting to default:', err);
    db = { ...DEFAULT_DB };
    saveDb();
  }
}

// Save database to file
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Helper to replace dynamic placeholders like {{today_jalali}}, {{today}}, etc.
function interpolateDynamicPlaceholders(text: string): string {
  if (!text) return text;

  const now = new Date();

  // Gregorian components
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const gregorianDate = `${year}-${month}-${day}`;

  // Unix timestamps
  const timestamp = now.getTime().toString();
  const timestampSeconds = Math.floor(now.getTime() / 1000).toString();

  // Jalali components via Intl
  let jalaliYear = '1405';
  let jalaliMonth = '04';
  let jalaliDay = '17';
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    for (const part of parts) {
      if (part.type === 'year') jalaliYear = part.value;
      if (part.type === 'month') jalaliMonth = part.value;
      if (part.type === 'day') jalaliDay = part.value;
    }
  } catch (e) {
    console.error('Error formatting Jalali date with Intl:', e);
  }
  const jalaliDate = `${jalaliYear}-${jalaliMonth}-${jalaliDay}`;

  return text
    .replace(/\{\{today\}\}/gi, gregorianDate)
    .replace(/\{\{date\}\}/gi, gregorianDate)
    .replace(/\{\{today_jalali\}\}/gi, jalaliDate)
    .replace(/\{\{jalali_date\}\}/gi, jalaliDate)
    .replace(/\{\{timestamp\}\}/gi, timestamp)
    .replace(/\{\{timestamp_seconds\}\}/gi, timestampSeconds)
    .replace(/\{\{year\}\}/gi, year)
    .replace(/\{\{month\}\}/gi, month)
    .replace(/\{\{day\}\}/gi, day)
    .replace(/\{\{jalali_year\}\}/gi, jalaliYear)
    .replace(/\{\{jalali_month\}\}/gi, jalaliMonth)
    .replace(/\{\{jalali_day\}\}/gi, jalaliDay);
}

// Helper to extract nested properties from an object (e.g. "data.users[0].health" or "status")
function getValueByPath(obj: any, pathStr: string): any {
  if (!pathStr || !obj) return undefined;
  
  // Clean paths, split by dots or bracket notation
  const parts = pathStr.replace(/\[(\w+)\]/g, '.$1').split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

// Generate unique IDs
function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

// Main background checker function
async function checkService(service: Service) {
  const group = db.groups.find(g => g.id === service.groupId);
  const token = group ? group.token : '';

  // Prepare URL and Headers
  const url = interpolateDynamicPlaceholders(service.url);
  const headersObj: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  for (const header of service.headers) {
    // Replace token placeholder
    let val = header.value.replace('{TOKEN}', token).replace('{token}', token);
    val = interpolateDynamicPlaceholders(val);
    headersObj[header.key] = val;
  }

  const fetchOptions: RequestInit = {
    method: service.method,
    headers: headersObj
  };

  if (service.method !== 'GET' && service.body) {
    try {
      fetchOptions.body = interpolateDynamicPlaceholders(service.body);
    } catch (e) {
      console.error('Error setting service body:', e);
    }
  }

  const startTime = performance.now();
  let statusCode = 0;
  let responseTime = 0;
  let responseData: any = null;
  let checkStatus: 'UP' | 'DOWN' | 'WARN' = 'UP';
  let errMsg: string | undefined = undefined;
  let fieldValue: any = undefined;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s max timeout

    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    clearTimeout(timeoutId);

    statusCode = response.status;
    responseTime = Math.round(performance.now() - startTime);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseData = await response.json();
      // Extract the field value
      fieldValue = getValueByPath(responseData, service.monitorField);
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
        fieldValue = getValueByPath(responseData, service.monitorField);
      } catch (e) {
        // Not a JSON response, we monitor raw text if field is empty, otherwise we fail on field extraction
        responseData = { raw_text: text };
        if (service.monitorField === 'raw_text') {
          fieldValue = text;
        } else {
          fieldValue = undefined;
        }
      }
    }

    // Evaluation logic
    // 1. Status Code Check
    if (statusCode < 200 || statusCode >= 300) {
      checkStatus = 'DOWN';
      errMsg = `کد وضعیت نامعتبر: ${statusCode}`;
    }
    // 2. Field Value Check based on monitorType
    else {
      const type = service.monitorType || (service.monitorField ? 'FIELD_MATCH' : 'STATUS_ONLY');
      
      if (type === 'FIELD_MATCH' && service.monitorField) {
        if (fieldValue === undefined) {
          checkStatus = 'DOWN';
          errMsg = `فیلد مورد مانیتور "${service.monitorField}" در پاسخ یافت نشد`;
        } else {
          const strVal = String(fieldValue).trim();
          const strExpected = String(service.expectedValue).trim();
          if (strVal !== strExpected) {
            checkStatus = 'DOWN';
            errMsg = `مقدار فیلد "${service.monitorField}" برابر است با "${strVal}" در صورتی که انتظار می‌رفت "${strExpected}" باشد`;
          }
        }
      } else if (type === 'STATISTICAL' && service.monitorField) {
        if (fieldValue === undefined) {
          checkStatus = 'DOWN';
          errMsg = `فیلد آماری "${service.monitorField}" در پاسخ یافت نشد`;
        } else {
          const numValue = Number(fieldValue);
          if (isNaN(numValue)) {
            checkStatus = 'DOWN';
            errMsg = `مقدار فیلد آماری "${service.monitorField}" یک عدد معتبر نیست: ${fieldValue}`;
          } else {
            const min = service.minRange !== undefined && service.minRange !== null ? Number(service.minRange) : null;
            const max = service.maxRange !== undefined && service.maxRange !== null ? Number(service.maxRange) : null;
            
            if (min !== null && numValue < min) {
              checkStatus = 'WARN';
              errMsg = `مقدار فیلد آماری (${numValue}) کمتر از حداقل محدوده مجاز (${min}) است`;
            } else if (max !== null && numValue > max) {
              checkStatus = 'WARN';
              errMsg = `مقدار فیلد آماری (${numValue}) بیشتر از حداکثر محدوده مجاز (${max}) است`;
            }
          }
        }
      }
    }
    
    // 3. Response Time Check
    if (checkStatus === 'UP' && responseTime > service.responseTimeThreshold) {
      checkStatus = 'WARN';
      errMsg = `زمان پاسخ طولانی: ${responseTime} میلی‌ثانیه (حداکثر مجاز: ${service.responseTimeThreshold})`;
    }

  } catch (err: any) {
    responseTime = Math.round(performance.now() - startTime);
    checkStatus = 'DOWN';
    errMsg = err.name === 'AbortError' ? 'خطای زمان استراحت (Timeout) بیش از ۱۰ ثانیه' : `خطای برقراری ارتباط: ${err.message}`;
  }

  // Update Service state
  service.status = checkStatus;
  service.lastChecked = new Date().toISOString();

  // Create History Record
  const historyRecord: CheckHistory = {
    id: generateId(),
    serviceId: service.id,
    timestamp: new Date().toISOString(),
    status: checkStatus,
    statusCode,
    responseTime,
    fieldValue,
    errorMessage: errMsg
  };

  db.history.push(historyRecord);
  // Cap history size to 300 records
  if (db.history.length > 300) {
    db.history.shift();
  }

  // Alert management
  if (checkStatus === 'DOWN' || checkStatus === 'WARN') {
    // Check if an unresolved alert of similar type already exists for this service
    const existingAlert = db.alerts.find(a => a.serviceId === service.id && !a.resolved);
    if (!existingAlert) {
      const alertType = errMsg?.includes('کد وضعیت') ? 'STATUS_CODE' 
                    : errMsg?.includes('زمان پاسخ') ? 'RESPONSE_TIME' 
                    : errMsg?.includes('فیلد') ? 'FIELD_MISMATCH' 
                    : 'ERROR';
                    
      const newAlert: Alert = {
        id: generateId(),
        serviceId: service.id,
        serviceName: service.name,
        groupName: group ? group.name : 'بدون گروه',
        timestamp: new Date().toISOString(),
        type: alertType as any,
        message: errMsg || 'خطای نامشخص در سرویس',
        resolved: false
      };
      db.alerts.unshift(newAlert);
    } else {
      // Update message if it changed
      existingAlert.message = errMsg || existingAlert.message;
    }
  } else {
    // Service is UP, resolve any unresolved alerts
    db.alerts.forEach(a => {
      if (a.serviceId === service.id && !a.resolved) {
        a.resolved = true;
      }
    });
  }

  saveDb();
}

async function startServer() {
  loadDb();
  
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Background Loop Scheduler
  // Master tick every second, checking if any service's check interval has elapsed
  const lastCheckTime: Record<string, number> = {};
  
  setInterval(async () => {
    const now = Date.now();
    for (const service of db.services) {
      const lastCheck = lastCheckTime[service.id] || 0;
      const intervalMs = service.checkInterval * 1000;
      
      if (now - lastCheck >= intervalMs) {
        lastCheckTime[service.id] = now;
        // Run check asynchronously
        checkService(service).catch(err => {
          console.error(`Error checking service ${service.name}:`, err);
        });
      }
    }
  }, 1000);

  // --- API Routes ---

  // 1. Groups APIs
  app.get('/api/groups', (req, res) => {
    res.json(db.groups);
  });

  app.post('/api/groups', (req, res) => {
    const { name, token } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'نام گروه الزامی است' });
    }
    const newGroup: Group = {
      id: 'g_' + generateId(),
      name,
      token: token || '',
      tokenUpdatedAt: new Date().toISOString()
    };
    db.groups.push(newGroup);
    saveDb();
    res.status(201).json(newGroup);
  });

  app.put('/api/groups/:id/token', (req, res) => {
    const { id } = req.params;
    const { token } = req.body;
    
    const group = db.groups.find(g => g.id === id);
    if (!group) {
      return res.status(404).json({ error: 'گروه یافت نشد' });
    }
    
    group.token = token || '';
    group.tokenUpdatedAt = new Date().toISOString();
    saveDb();
    res.json(group);
  });

  app.delete('/api/groups/:id', (req, res) => {
    const { id } = req.params;
    
    const groupIndex = db.groups.findIndex(g => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({ error: 'گروه یافت نشد' });
    }
    
    // Find services that belong to this group
    const servicesToDelete = db.services.filter(s => s.groupId === id);
    const serviceIdsToDelete = servicesToDelete.map(s => s.id);
    
    // Remove group
    db.groups.splice(groupIndex, 1);
    
    // Remove services in this group
    db.services = db.services.filter(s => s.groupId !== id);
    
    // Remove history for those services
    db.history = db.history.filter(h => !serviceIdsToDelete.includes(h.serviceId));
    
    // Remove alerts for those services
    db.alerts = db.alerts.filter(a => !serviceIdsToDelete.includes(a.serviceId));
    
    saveDb();
    res.json({ success: true, message: 'گروه و تمامی سرویس‌های وابسته به آن با موفقیت حذف شدند' });
  });

  // 2. Services APIs
  app.get('/api/services', (req, res) => {
    res.json(db.services);
  });

  app.post('/api/services', (req, res) => {
    const {
      groupId,
      name,
      url,
      method,
      headers,
      body,
      monitorField,
      expectedValue,
      checkInterval,
      responseTimeThreshold,
      monitorType,
      minRange,
      maxRange
    } = req.body;

    if (!groupId || !name || !url) {
      return res.status(400).json({ error: 'وارد کردن شناسه گروه، نام سرویس و آدرس URL الزامی است' });
    }

    const newService: Service = {
      id: 's_' + generateId(),
      groupId,
      name,
      url,
      method: method || 'GET',
      headers: headers || [],
      body: body || '',
      monitorField: monitorField || '',
      expectedValue: expectedValue !== undefined ? String(expectedValue) : '',
      checkInterval: Number(checkInterval) || 30,
      responseTimeThreshold: Number(responseTimeThreshold) || 1000,
      status: 'UNKNOWN',
      monitorType: monitorType || (monitorField ? 'FIELD_MATCH' : 'STATUS_ONLY'),
      minRange: minRange !== undefined && minRange !== '' ? Number(minRange) : undefined,
      maxRange: maxRange !== undefined && maxRange !== '' ? Number(maxRange) : undefined
    };

    db.services.push(newService);
    saveDb();
    
    // Perform an immediate initial check
    checkService(newService).catch(console.error);

    res.status(201).json(newService);
  });

  app.delete('/api/services/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.services.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'سرویس یافت نشد' });
    }
    db.services.splice(idx, 1);
    // Remove related history and alerts
    db.history = db.history.filter(h => h.serviceId !== id);
    db.alerts = db.alerts.filter(a => a.serviceId !== id);
    saveDb();
    res.json({ message: 'سرویس با موفقیت حذف شد' });
  });

  // 3. Alerts APIs
  app.get('/api/alerts', (req, res) => {
    res.json(db.alerts);
  });

  app.post('/api/alerts/resolve-all', (req, res) => {
    db.alerts.forEach(a => {
      a.resolved = true;
    });
    saveDb();
    res.json({ message: 'تمام هشدارها به وضعیت رفع شده تغییر یافتند' });
  });

  app.post('/api/alerts/:id/resolve', (req, res) => {
    const { id } = req.params;
    const alert = db.alerts.find(a => a.id === id);
    if (alert) {
      alert.resolved = true;
      saveDb();
    }
    res.json({ message: 'وضعیت هشدار بروزرسانی شد' });
  });

  // 4. Monitoring Logs & History APIs
  app.get('/api/history', (req, res) => {
    const { serviceId } = req.query;
    if (serviceId) {
      const filtered = db.history.filter(h => h.serviceId === serviceId);
      return res.json(filtered);
    }
    res.json(db.history);
  });

  // 5. Run manual trigger for check
  app.post('/api/run-all-checks', async (req, res) => {
    const promises = db.services.map(s => checkService(s));
    await Promise.all(promises);
    res.json({ message: 'بررسی دستی تمام وب‌سرویس‌ها با موفقیت انجام شد' });
  });

  // 6. Test Call Proxy API (Lets the client do a test run to inspect JSON before creation)
  app.post('/api/test-call', async (req, res) => {
    const { url: rawUrl, method, headers, body: rawBody, groupId } = req.body;
    if (!rawUrl) {
      return res.status(400).json({ error: 'آدرس URL الزامی است' });
    }

    const url = interpolateDynamicPlaceholders(rawUrl);

    // Fetch the token of the associated group if defined
    let token = '';
    if (groupId) {
      const g = db.groups.find(group => group.id === groupId);
      if (g) token = g.token;
    }

    const headersObj: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.key && h.value) {
          let val = h.value.replace('{TOKEN}', token).replace('{token}', token);
          val = interpolateDynamicPlaceholders(val);
          headersObj[h.key] = val;
        }
      }
    }

    const body = rawBody ? interpolateDynamicPlaceholders(rawBody) : undefined;

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 8000); // 8s timeout for test calls

      const response = await fetch(url, {
        method: method || 'GET',
        headers: headersObj,
        body: (method !== 'GET' && body) ? body : undefined,
        signal: controller.signal
      });
      clearTimeout(tId);

      const responseTime = Math.round(performance.now() - startTime);
      const statusCode = response.status;
      const contentType = response.headers.get('content-type') || '';
      
      let responseBody: any = null;
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        const text = await response.text();
        try {
          responseBody = JSON.parse(text);
        } catch (e) {
          responseBody = { raw_text: text };
        }
      }

      res.json({
        success: true,
        statusCode,
        responseTime,
        body: responseBody
      });
    } catch (err: any) {
      const responseTime = Math.round(performance.now() - startTime);
      res.json({
        success: false,
        statusCode: 0,
        responseTime,
        error: err.name === 'AbortError' ? 'خطای زمان استراحت (عدم پاسخ طی ۸ ثانیه)' : err.message
      });
    }
  });

  // 7. Mock Endpoints APIs (Create / Edit simulated APIs)
  app.get('/api/mock-endpoints', (req, res) => {
    res.json(db.mockEndpoints);
  });

  app.post('/api/mock-endpoints', (req, res) => {
    const { path: routePath, status, responseTimeDelay, responseBody } = req.body;
    if (!routePath) {
      return res.status(400).json({ error: 'مسیر روت الزامی است' });
    }
    
    // Basic sanitization
    const cleanPath = routePath.replace(/^\/+|\/+$/g, '');

    const newMock: MockEndpoint = {
      id: 'mock_' + generateId(),
      path: cleanPath,
      status: Number(status) || 200,
      responseTimeDelay: Number(responseTimeDelay) || 0,
      responseBody: responseBody || '{}'
    };

    db.mockEndpoints.push(newMock);
    saveDb();
    res.status(201).json(newMock);
  });

  app.put('/api/mock-endpoints/:id', (req, res) => {
    const { id } = req.params;
    const { status, responseTimeDelay, responseBody } = req.body;

    const mock = db.mockEndpoints.find(m => m.id === id);
    if (!mock) {
      return res.status(404).json({ error: 'روت شبیه‌ساز یافت نشد' });
    }

    mock.status = Number(status) !== undefined ? Number(status) : mock.status;
    mock.responseTimeDelay = Number(responseTimeDelay) !== undefined ? Number(responseTimeDelay) : mock.responseTimeDelay;
    mock.responseBody = responseBody !== undefined ? responseBody : mock.responseBody;

    saveDb();
    res.json(mock);
  });

  // 8. Serving Mock Endpoints
  // Handled dynamically based on the registered mock list
  app.all('/api/mock/*', async (req, res) => {
    const routePath = req.params[0]; // e.g. "finance/status"
    const mock = db.mockEndpoints.find(m => m.path === routePath);

    if (!mock) {
      return res.status(404).json({
        error: 'آدرس شبیه‌ساز در دسترس نیست',
        hint: `می‌توانید مسیر "${routePath}" را در لیست شبیه‌سازها تعریف کنید.`
      });
    }

    // Simulate delay
    if (mock.responseTimeDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, mock.responseTimeDelay));
    }

    // Set Status & Send response body
    res.status(mock.status);
    
    try {
      const parsedJson = JSON.parse(mock.responseBody);
      res.json(parsedJson);
    } catch (e) {
      res.send(mock.responseBody);
    }
  });


  // --- Vite / Static Assets setup ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web Service Monitoring system running on http://localhost:${PORT}`);
  });
}

startServer();
