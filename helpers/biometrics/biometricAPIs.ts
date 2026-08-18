import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

const md5 = async (str: string) => {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, str);
};

export interface RegisterUserParams {
  ip: string;
  port: number;
  devIndex: string;
  username?: string;
  password?: string;
  employeeNo: string;
  name: string;
  beginTime?: string;
  endTime?: string;
}

export const registerUserOnDevice = async (params: RegisterUserParams) => {
  const { ip, port, devIndex, employeeNo, name } = params;
  const username = params.username || 'admin';
  const password = params.password || '7093256562@Shiva';
  const beginTime = params.beginTime || new Date().toISOString().split('.')[0];
  const endTime = params.endTime || "2037-12-31T23:59:59";

  const userInfoPayload = {
    UserInfo: {
      employeeNo,
      name,
      userType: "normal",
      Valid: {
        enable: true,
        beginTime,
        endTime
      },
      doorRight: "1",
      RightPlan: [
        {
          doorNo: 1,
          planTemplateNo: "1"
        }
      ]
    }
  };

  const digestFetch = async (apiEndpoint: string, method: string, payload: any) => {
    const url = `http://${ip}:${port}/ISAPI/${apiEndpoint}?format=json&devIndex=${devIndex}`;
    const uri = `/ISAPI/${apiEndpoint}?format=json&devIndex=${devIndex}`;

    const initialResponse = await fetch(url, { method });

    if (initialResponse.ok) {
      const t = await initialResponse.text();
      try { return JSON.parse(t); } catch { return { rawXml: t }; }
    }

    let authHeader = initialResponse.headers.get('www-authenticate') || '';

    if (!authHeader && method !== 'GET') {
      const getResponse = await fetch(url, { method: 'GET' });
      authHeader = getResponse.headers.get('www-authenticate') || '';
    }

    if (!authHeader) throw new Error("No digest challenge from device");

    const getParam = (str: string, param: string) => {
      const match = str.match(new RegExp(`${param}="?([^",]+)"?`));
      return match ? match[1] : '';
    };

    const realm = getParam(authHeader, 'realm');
    const nonce = getParam(authHeader, 'nonce');
    const qop = getParam(authHeader, 'qop');
    const opaque = getParam(authHeader, 'opaque');
    const nc = '00000001';
    const cnonce = Math.random().toString(36).substring(2, 15);

    const ha1 = await md5(`${username}:${realm}:${password}`);
    const ha2 = await md5(`${method}:${uri}`);

    const responseHash = qop
      ? await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      : await md5(`${ha1}:${nonce}:${ha2}`);

    let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
    if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    if (opaque) authStr += `, opaque="${opaque}"`;

    const secondResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authStr
      },
      body: JSON.stringify(payload)
    });

    const text = await secondResponse.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { rawXml: text }; }

    if (!secondResponse.ok) {
      const err = new Error(`Device rejected request with status ${secondResponse.status}. Details: ${text}`) as any;
      err.subStatusCode = data?.subStatusCode;
      throw err;
    }

    return data;
  };

  try {
    return await digestFetch('AccessControl/UserInfo/Record', 'POST', userInfoPayload);
  } catch (err: any) {
    if (err?.subStatusCode === 'employeeNoAlreadyExist') {
      return await digestFetch('AccessControl/UserInfo/Modify', 'PUT', userInfoPayload);
    }
    throw err;
  }
};

export interface DeleteUserParams {
  ip: string;
  port: number;
  devIndex: string;
  username?: string;
  password?: string;
  employeeNo: string;
}

export const deleteUserOnDevice = async (params: DeleteUserParams) => {
  const { ip, port, devIndex, employeeNo } = params;
  const username = params.username || 'admin';
  const password = params.password || '7093256562@Shiva';

  const url = `http://${ip}:${port}/ISAPI/AccessControl/UserInfoDetail/Delete?format=json&devIndex=${devIndex}`;
  const method = 'PUT';

  const payload = {
    UserInfoDetail: {
      mode: "byEmployeeNo",
      EmployeeNoList: [
        {
          employeeNo: employeeNo.toString()
        }
      ]
    }
  };

  const initialResponse = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (initialResponse.ok) {
    return await initialResponse.json();
  }

  if (initialResponse.status === 400) {
    const errorText = await initialResponse.text();
    throw new Error(`Device rejected initial request with status 400. Details: ${errorText}`);
  }

  if (initialResponse.status === 401) {
    const authHeader = initialResponse.headers.get('www-authenticate');
    if (!authHeader || !authHeader.toLowerCase().startsWith('digest')) {
      throw new Error("Device did not return a valid Digest challenge");
    }

    const getParam = (str: string, param: string) => {
      const regex = new RegExp(`${param}="?([^",]+)"?`);
      const match = str.match(regex);
      return match ? match[1] : '';
    };

    const realm = getParam(authHeader, 'realm');
    const nonce = getParam(authHeader, 'nonce');
    const qop = getParam(authHeader, 'qop');
    const opaque = getParam(authHeader, 'opaque');

    const uri = `/ISAPI/AccessControl/UserInfoDetail/Delete?format=json&devIndex=${devIndex}`;
    const nc = '00000001';
    const cnonce = Math.random().toString(36).substring(2, 15);

    const ha1 = await md5(`${username}:${realm}:${password}`);
    const ha2 = await md5(`${method}:${uri}`);

    let responseHash;
    if (qop) {
      responseHash = await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    } else {
      responseHash = await md5(`${ha1}:${nonce}:${ha2}`);
    }

    let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
    if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    if (opaque) authStr += `, opaque="${opaque}"`;

    const secondResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authStr
      },
      body: JSON.stringify(payload)
    });

    if (!secondResponse.ok) {
      const errorText = await secondResponse.text();
      throw new Error(`Device rejected request with status ${secondResponse.status}. Details: ${errorText}`);
    }

    return await secondResponse.json();
  }

  throw new Error(`Unexpected device response: ${initialResponse.status}`);
};

export interface UploadFingerprintParams {
  ip: string;
  port: number;
  devIndex: string;
  username?: string;
  password?: string;
  employeeNo: string;
  fingerPrintID?: number;
  fingerData?: string;
}

export const uploadFingerprintToDevice = async (params: UploadFingerprintParams) => {
  const { ip, port, devIndex, employeeNo } = params;
  const username = params.username || 'admin';
  const password = params.password || '7093256562@Shiva';
  const fingerPrintID = params.fingerPrintID || 1;
  const fingerData = params.fingerData || "MzAxJCvpJFiId03BFFiIb0LZJTiID1VtJEis5VDRJUiEg1RlFhiUh2rVFTiADI65JYh8FpVZFbiUEmidFkiUFK6VFAjB6cbBFFi3OsuZJViQKeIVJcicoMhBFnisJOdtJYiUOq6VFpignbepFgitqNKZJpikI+YxJliULbxdJoiolybhJSighYFNJmh4hoOVFmiEgopZFmiQE4udFniQGr5lFMjAR6VZFaigHLBhFXiUIdbNFniQIuy9JYiUMbb9JoioG9kNJyh4lu8NFQijhvgVJZijbvOlFniALwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAle4zRxMAQiICApcHFmQbAATBCBL9GTJRthscDWMiUJMGDM0EElBFFoYuMQRCoheCqysBgYoZGp03EUEwDCmkawLijBSXSlwBYZgQnRdiIqCaBIOCXiARtg4kG20HcFEJFENbAMGtEahgTwIi7gWHJHADMAIK6c8iAQAlCzoxbgEAeBIjQxUQwM0POgAAAAAAZIU=";

  const url = `http://${ip}:${port}/ISAPI/AccessControl/FingerPrintDownload?format=json&devIndex=${devIndex}`;
  const method = 'POST';

  const payload = {
    FingerPrintCfg: {
      employeeNo: employeeNo.toString(),
      enableCardReader: [1],
      fingerPrintID,
      fingerType: "normalFP",
      fingerData
    }
  };

  const initialResponse = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (initialResponse.ok) {
    return await initialResponse.json();
  }

  if (initialResponse.status === 400) {
    const errorText = await initialResponse.text();
    throw new Error(`Device rejected initial request with status 400. Details: ${errorText}`);
  }

  if (initialResponse.status === 401) {
    const authHeader = initialResponse.headers.get('www-authenticate');
    if (!authHeader || !authHeader.toLowerCase().startsWith('digest')) {
      throw new Error("Device did not return a valid Digest challenge");
    }

    const getParam = (str: string, param: string) => {
      const regex = new RegExp(`${param}="?([^",]+)"?`);
      const match = str.match(regex);
      return match ? match[1] : '';
    };

    const realm = getParam(authHeader, 'realm');
    const nonce = getParam(authHeader, 'nonce');
    const qop = getParam(authHeader, 'qop');
    const opaque = getParam(authHeader, 'opaque');

    const uri = `/ISAPI/AccessControl/FingerPrintDownload?format=json&devIndex=${devIndex}`;
    const nc = '00000001';
    const cnonce = Math.random().toString(36).substring(2, 15);

    const ha1 = await md5(`${username}:${realm}:${password}`);
    const ha2 = await md5(`${method}:${uri}`);

    let responseHash;
    if (qop) {
      responseHash = await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    } else {
      responseHash = await md5(`${ha1}:${nonce}:${ha2}`);
    }

    let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
    if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    if (opaque) authStr += `, opaque="${opaque}"`;

    const secondResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authStr
      },
      body: JSON.stringify(payload)
    });

    if (!secondResponse.ok) {
      const errorText = await secondResponse.text();
      throw new Error(`Device rejected request with status ${secondResponse.status}. Details: ${errorText}`);
    }

    return await secondResponse.json();
  }

  throw new Error(`Unexpected device response: ${initialResponse.status}`);
};



export const captureFingerprintOnDevice = async (params: UploadFingerprintParams) => {
  const { ip, port, devIndex, employeeNo } = params;
  const username = params.username || 'admin';
  const password = params.password || '7093256562@Shiva';
  const fingerPrintID = params.fingerPrintID || 1;

  const helperFetch = async (endpoint: string, method: string, payload?: any, customContentType?: string) => {
    const url = `http://${ip}:${port}${endpoint}?format=json&devIndex=${devIndex}`;
    const isStringPayload = typeof payload === 'string';
    const bodyContent = isStringPayload ? payload : (payload ? JSON.stringify(payload) : undefined);
    const contentType = customContentType || (payload ? 'application/json' : undefined);

    const initialResponse = await fetch(url, {
      method,
      headers: contentType ? { 'Content-Type': contentType } : undefined,
      body: bodyContent
    });

    if (initialResponse.ok) {
      const okText = await initialResponse.text();
      try { return JSON.parse(okText); } catch { return { rawXml: okText }; }
    }
    if (initialResponse.status !== 401) {
      const err = await initialResponse.text().catch(() => '');
      throw new Error(`Request failed with ${initialResponse.status}: ${err}`);
    }

    const authHeader = initialResponse.headers.get('www-authenticate');
    if (!authHeader) throw new Error("No digest challenge");

    const getParam = (str: string, param: string) => {
      const match = str.match(new RegExp(`${param}="?([^",]+)"?`));
      return match ? match[1] : '';
    };

    const realm = getParam(authHeader, 'realm');
    const nonce = getParam(authHeader, 'nonce');
    const qop = getParam(authHeader, 'qop');
    const opaque = getParam(authHeader, 'opaque');
    const uri = `${endpoint}?format=json&devIndex=${devIndex}`;
    const nc = '00000001';
    const cnonce = Math.random().toString(36).substring(2, 15);

    const ha1 = await md5(`${username}:${realm}:${password}`);
    const ha2 = await md5(`${method}:${uri}`);

    const responseHash = qop
      ? await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      : await md5(`${ha1}:${nonce}:${ha2}`);

    let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
    if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    if (opaque) authStr += `, opaque="${opaque}"`;

    const secondResponse = await fetch(url, {
      method,
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        'Authorization': authStr
      },
      body: bodyContent
    });

    if (!secondResponse.ok) {
      const err = await secondResponse.text().catch(() => '');
      throw new Error(`Auth failed with ${secondResponse.status}: ${err}`);
    }

    const text = await secondResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawXml: text };
    }
    return data;
  };

  const deletePayloads = [
    { FingerPrintDelete: { employeeNo: employeeNo.toString() } },
    { FingerPrintDeleteCond: { EmployeeNoList: [{ employeeNo: employeeNo.toString() }] } },
  ];
  for (const delPayload of deletePayloads) {
    try {
      await helperFetch('/ISAPI/AccessControl/FingerPrint/Delete', 'PUT', delPayload);
      break;
    } catch (e: any) {
      console.warn('[CaptureFingerPrint] 0. Delete attempt failed (may be OK):', e.message?.substring(0, 120));
    }
  }

  let result: any = null;

  const attemptCapture = async (payload: any, isXml: boolean = false) => {
    return await helperFetch(
      `/ISAPI/AccessControl/CaptureFingerPrint${isXml ? '' : '?format=json'}`,
      'POST',
      payload,
      isXml ? 'application/xml' : undefined
    );
  };

  const isRetryable = (e: any) => {
    return e?.subStatusCode === 'invalidOperation' ||
      e?.subStatusCode === 'badRequest' ||
      e?.subStatusCode === 'deviceError' ||
      e?.subStatusCode === 'badXmlContent' ||
      e?.message?.includes('400') ||
      e?.message?.includes('415');
  };

  let lastError: any;

  try {
    result = await attemptCapture(`
<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
  <fingerNo>${fingerPrintID}</fingerNo>
</CaptureFingerPrintCond>
    `.trim(), true);
  } catch (e: any) {
    lastError = e;
    if (!isRetryable(e)) throw e;
  }

  if (!result) {
    try {
      result = await attemptCapture(JSON.stringify({ CaptureFingerPrintCond: { fingerNo: fingerPrintID } }), false);
    } catch (e: any) {
      lastError = e;
      if (!isRetryable(e)) throw e;
    }
  }

  if (!result) {
    try {
      result = await attemptCapture(`
<CaptureFingerPrintCond version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
  <fingerNo>${fingerPrintID}</fingerNo>
</CaptureFingerPrintCond>
      `.trim(), true);
    } catch (e: any) {
      lastError = e;
      if (!isRetryable(e)) throw e;
    }
  }

  if (!result && fingerPrintID !== 1) {
    try {
      result = await attemptCapture(`
<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
  <fingerNo>1</fingerNo>
</CaptureFingerPrintCond>
      `.trim(), true);
    } catch (e: any) {
      lastError = e;
      if (!isRetryable(e)) throw e;
    }
  }

  if (!result) {
    console.warn('[CaptureFingerPrint] All capture payloads failed.');
    throw new Error('Failed to trigger fingerprint capture on device. Please try again.');
  }

  let fingerData = '';
  if (result?.CaptureFingerPrint?.fingerData) {
    fingerData = result.CaptureFingerPrint.fingerData;
  } else if (result?.FingerPrintCfg?.fingerData) {
    fingerData = result.FingerPrintCfg.fingerData;
  } else if (result?.fingerData) {
    fingerData = result.fingerData;
  } else if (result?.rawXml) {
    const match = result.rawXml.match(/<fingerData>([\s\S]*?)<\/fingerData>/);
    if (match) {
      fingerData = match[1].trim();
    }
  }

  if (!fingerData) {
    console.error('[CaptureFingerPrint] Full result was:', JSON.stringify(result).substring(0, 500));
    throw new Error('Capture succeeded but no fingerData was returned.');
  }

  const uploadPayload = {
    FingerPrintCfg: {
      employeeNo: employeeNo.toString(),
      enableCardReader: [1],
      fingerPrintID,
      fingerType: "normalFP",
      fingerData,
    }
  };

  let registered = false;

  try {
    const res1 = await helperFetch('/ISAPI/AccessControl/FingerPrintDownload', 'POST', uploadPayload);
    registered = true;
  } catch (e: any) {
    console.warn('[CaptureFingerPrint] 3a. FingerPrintDownload failed:', e.message?.substring(0, 150));
  }

  if (!registered) {
    try {
      const res2 = await helperFetch('/ISAPI/AccessControl/FingerPrint/SetUp', 'POST', uploadPayload);
      registered = true;
    } catch (e: any) {
      console.error('[CaptureFingerPrint] 3b. FingerPrint/SetUp also failed:', e.message?.substring(0, 150));
    }
  }

  if (!registered) {
    throw new Error('Failed to register fingerprint on device. Both endpoints failed.');
  }

  return { success: true, fingerData };
};

export interface UploadFaceParams {
  ip: string;
  port: number;
  devIndex: string;
  username?: string;
  password?: string;
  employeeNo: string;
  imageUri: string;
}

export const captureFaceOnDevice = async (params: Omit<UploadFaceParams, 'imageUri'>) => {
  const { ip, port, devIndex, employeeNo } = params;
  const username = params.username || 'admin';
  const password = params.password || '7093256562@Shiva';

  // Reuse the same helperFetch pattern from captureFingerprintOnDevice
  const helperFetch = async (endpoint: string, method: string, payload?: any, customContentType?: string, skipDevIndex?: boolean) => {
    const suffix = skipDevIndex ? 'format=json' : `format=json&devIndex=${devIndex}`;
    const url = `http://${ip}:${port}${endpoint}${endpoint.includes('?') ? '&' : '?'}${suffix}`;
    const isStringPayload = typeof payload === 'string';
    const bodyContent = isStringPayload ? payload : (payload ? JSON.stringify(payload) : undefined);
    const contentType = customContentType || (payload ? 'application/json' : undefined);

    const initialResponse = await fetch(url, {
      method,
      headers: contentType ? { 'Content-Type': contentType } : undefined,
      body: bodyContent
    });


    if (initialResponse.ok) {
      const okText = await initialResponse.text();
      try { return JSON.parse(okText); } catch { return { rawXml: okText }; }
    }
    if (initialResponse.status !== 401) {
      const errText = await initialResponse.text().catch(() => '');
      console.error(`[captureFace helperFetch] Non-401 error: ${errText.substring(0, 300)}`);
      const err = new Error(`Request failed with ${initialResponse.status}: ${errText}`) as any;
      try { const parsed = JSON.parse(errText); err.subStatusCode = parsed.subStatusCode; } catch { }
      throw err;
    }

    const authHeader = initialResponse.headers.get('www-authenticate');
    if (!authHeader) throw new Error("No digest challenge");

    const getParam = (str: string, param: string) => {
      const match = str.match(new RegExp(`${param}="?([^",]+)"?`));
      return match ? match[1] : '';
    };

    const realm = getParam(authHeader, 'realm');
    const nonce = getParam(authHeader, 'nonce');
    const qop = getParam(authHeader, 'qop');
    const opaque = getParam(authHeader, 'opaque');
    const uri = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${suffix}`;
    const nc = '00000001';
    const cnonce = Math.random().toString(36).substring(2, 15);

    const ha1 = await md5(`${username}:${realm}:${password}`);
    const ha2 = await md5(`${method}:${uri}`);

    const responseHash = qop
      ? await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      : await md5(`${ha1}:${nonce}:${ha2}`);

    let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
    if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    if (opaque) authStr += `, opaque="${opaque}"`;

    const secondResponse = await fetch(url, {
      method,
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        'Authorization': authStr
      },
      body: bodyContent
    });

    const text = await secondResponse.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { rawXml: text }; }

    if (!secondResponse.ok) {
      const err = new Error(`Auth failed with ${secondResponse.status}: ${text}`) as any;
      err.subStatusCode = data?.subStatusCode;
      throw err;
    }

    return data;
  };

  try {
    const caps = await helperFetch('/ISAPI/AccessControl/CaptureFaceData/capabilities', 'GET', undefined, undefined, true);
  } catch (e: any) {
    console.warn('[captureFace] Capabilities query failed:', e.message?.substring(0, 200));
  }

  let result: any = null;
  let lastError: any;

  const isRetryable = (e: any) => {
    return e?.subStatusCode === 'invalidOperation' ||
      e?.subStatusCode === 'badRequest' ||
      e?.subStatusCode === 'badParameters' ||
      e?.subStatusCode === 'notSupport' ||
      e?.subStatusCode === 'badXmlContent' ||
      e?.message?.includes('400') ||
      e?.message?.includes('405');
  };

  try {
    result = await helperFetch('/ISAPI/AccessControl/CaptureFaceData', 'POST', {
      FaceCaptureCond: { employeeNo: String(employeeNo) }
    }, undefined, true);
  } catch (e: any) {
    lastError = e;
    console.warn('[captureFace] Attempt 1 failed:', e.message?.substring(0, 150));
    if (!isRetryable(e)) throw e;
  }

  if (!result) {
    try {
      result = await helperFetch('/ISAPI/AccessControl/CaptureFaceData', 'PUT', {
        FaceCaptureCond: { employeeNo: String(employeeNo) }
      }, undefined, true);
    } catch (e: any) {
      lastError = e;
      console.warn('[captureFace] Attempt 2 failed:', e.message?.substring(0, 150));
      if (!isRetryable(e)) throw e;
    }
  }

  if (!result) {
    try {
      const rawUrl = `http://${ip}:${port}/ISAPI/AccessControl/CaptureFaceData`;
      const xmlBody = `<FaceCaptureCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><employeeNo>${employeeNo}</employeeNo></FaceCaptureCond>`;
      const initResp = await fetch(rawUrl, { method: 'POST', headers: { 'Content-Type': 'application/xml' }, body: xmlBody });
      if (initResp.ok) {
        const t = await initResp.text();
        try { result = JSON.parse(t); } catch { result = { rawXml: t }; }
      } else if (initResp.status === 401) {
        const ah = initResp.headers.get('www-authenticate') || '';
        const gp = (s: string, p: string) => { const m = s.match(new RegExp(`${p}="?([^",]+)"?`)); return m ? m[1] : ''; };
        const rlm = gp(ah, 'realm'), nnc = gp(ah, 'nonce'), qp = gp(ah, 'qop'), opq = gp(ah, 'opaque');
        const u2 = '/ISAPI/AccessControl/CaptureFaceData', nc2 = '00000001', cn2 = Math.random().toString(36).substring(2, 15);
        const h1 = await md5(`${username}:${rlm}:${password}`), h2 = await md5(`POST:${u2}`);
        const rh = qp ? await md5(`${h1}:${nnc}:${nc2}:${cn2}:${qp}:${h2}`) : await md5(`${h1}:${nnc}:${h2}`);
        let as2 = `Digest username="${username}", realm="${rlm}", nonce="${nnc}", uri="${u2}", response="${rh}"`;
        if (qp) as2 += `, qop=${qp}, nc=${nc2}, cnonce="${cn2}"`; if (opq) as2 += `, opaque="${opq}"`;
        const r2 = await fetch(rawUrl, { method: 'POST', headers: { 'Content-Type': 'application/xml', 'Authorization': as2 }, body: xmlBody });
        const t2 = await r2.text();
        if (r2.ok) { try { result = JSON.parse(t2); } catch { result = { rawXml: t2 }; } }
        else { lastError = new Error(`Attempt 3 failed: ${r2.status}: ${t2}`); }
      } else {
        const t = await initResp.text().catch(() => '');
        console.warn('[captureFace] Attempt 3 non-401:', t.substring(0, 200));
        lastError = new Error(`Attempt 3: ${initResp.status}: ${t}`);
      }
    } catch (e: any) {
      lastError = e;
      console.warn('[captureFace] Attempt 3 error:', e.message?.substring(0, 150));
    }
  }

  if (!result) {
    try {
      result = await helperFetch('/ISAPI/AccessControl/CaptureFaceData', 'POST', {
        FaceCaptureCond: { captureMode: "realtime", faceLibType: "blackFD", employeeNo: String(employeeNo) }
      });
    } catch (e: any) {
      lastError = e;
      console.warn('[captureFace] Attempt 4 failed:', e.message?.substring(0, 150));
      if (!isRetryable(e)) throw e;
    }
  }

  if (!result) {
    console.error('[captureFace] All capture attempts failed.');
    throw lastError || new Error('Failed to trigger face capture on device. This device may not support remote face capture.');
  }

  let captureComplete = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const progress = await helperFetch('/ISAPI/AccessControl/CaptureFaceData', 'GET');

      const captureProgress = progress?.CaptureFaceData?.captureProgress ??
        progress?.captureProgress ?? -1;

      if (captureProgress >= 100) {
        captureComplete = true;
        break;
      }
    } catch (e: any) {
      console.warn(`[captureFace] Progress poll ${i + 1} error:`, e.message?.substring(0, 100));
      captureComplete = true;
      break;
    }
  }

  if (!captureComplete) {
    console.warn('[captureFace] Capture timed out after 30s polling.');
  }

  return result;
};

export const uploadFaceToDevice = async (params: UploadFaceParams) => {
  const { ip, port, devIndex, employeeNo, imageUri } = params;
  const username = params.username || 'admin';
  const password = params.password || '7093256562@Shiva';

  const method = 'POST';
  const apiEndpoint = 'Intelligent/FDLib/FaceDataRecord';
  const url = `http://${ip}:${port}/ISAPI/${apiEndpoint}?format=json&devIndex=${devIndex}`;
  const uri = `/ISAPI/${apiEndpoint}?format=json&devIndex=${devIndex}`;

  let authHeader = '';
  try {
    const initialResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    authHeader = initialResponse.headers.get('www-authenticate') || '';
  } catch (err: any) {
    try {
      const getResponse = await fetch(url, { method: 'GET' });
      authHeader = getResponse.headers.get('www-authenticate') || '';
    } catch (getErr: any) {
      console.error("Fallback GET request also failed:", getErr.message);
      throw new Error(`Network failed when connecting to device: ${getErr.message}`);
    }
  }

  if (!authHeader) {
    throw new Error("No digest challenge received from device. Device might be offline or URL is wrong.");
  }

  const getParam = (str: string, param: string) => {
    const match = str.match(new RegExp(`${param}="?([^",]+)"?`));
    return match ? match[1] : '';
  };

  const realm = getParam(authHeader, 'realm');
  const nonce = getParam(authHeader, 'nonce');
  const qop = getParam(authHeader, 'qop');
  const opaque = getParam(authHeader, 'opaque');
  const nc = '00000001';
  const cnonce = Math.random().toString(36).substring(2, 15);

  const ha1 = await md5(`${username}:${realm}:${password}`);
  const ha2 = await md5(`${method}:${uri}`);

  const responseHash = qop
    ? await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : await md5(`${ha1}:${nonce}:${ha2}`);

  let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
  if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  if (opaque) authStr += `, opaque="${opaque}"`;


  try {
    const uploadResult = await FileSystem.uploadAsync(url, imageUri, {
      httpMethod: 'POST',
      uploadType: 1 as any,
      fieldName: 'FaceDataRecord',
      parameters: {
        data: JSON.stringify({
          faceLibType: "blackFD",
          FDID: "1",
          FPID: String(employeeNo),
          FaceInfo: {
            employeeNo: String(employeeNo)
          }
        })
      },
      headers: {
        'Authorization': authStr
      }
    });

    let data;
    try { data = JSON.parse(uploadResult.body); } catch { data = { rawXml: uploadResult.body }; }

    if (uploadResult.status !== 200 || (data?.statusCode && data.statusCode !== 1)) {
      console.error("Device rejected the request with status", uploadResult.status, data);
      const err = new Error(`Device rejected request with status ${uploadResult.status}. Details: ${uploadResult.body}`) as any;
      err.subStatusCode = data?.subStatusCode || data?.subCode;
      throw err;
    }

    return data;
  } catch (err: any) {
    console.error("=== uploadFaceToDevice FAILED ===", err);
    throw err;
  }
};

export const deleteFaceFromDevice = async (
  params: Omit<UploadFaceParams, 'imageUri'>
) => {
  const { ip, port, devIndex, employeeNo } = params;
  const username = params.username || 'admin';
  const password = params.password || '7093256562@Shiva';
  const empNo = String(employeeNo);

  const helperFetch = async (
    endpoint: string,
    method: string,
    payload?: any,
    customContentType?: string
  ) => {
    const url = `http://${ip}:${port}/ISAPI/${endpoint}${endpoint.includes('?') ? '&' : '?'}devIndex=${devIndex}`;
    const uri = `/ISAPI/${endpoint}${endpoint.includes('?') ? '&' : '?'}devIndex=${devIndex}`;
    const isStringPayload = typeof payload === 'string';
    const bodyContent = isStringPayload ? payload : (payload ? JSON.stringify(payload) : undefined);
    const contentType = customContentType || (payload ? 'application/json' : undefined);

    const initialResponse = await fetch(url, {
      method,
      headers: contentType ? { 'Content-Type': contentType } : undefined,
      body: bodyContent
    });

    if (initialResponse.ok) {
      const okText = await initialResponse.text();
      try { return JSON.parse(okText); } catch { return { rawXml: okText }; }
    }

    if (initialResponse.status !== 401) {
      const errText = await initialResponse.text().catch(() => '');
      const err = new Error(`Request failed with status ${initialResponse.status}: ${errText}`) as any;
      try { const parsed = JSON.parse(errText); err.subStatusCode = parsed.subStatusCode; err.errorMsg = parsed.errorMsg; } catch { }
      throw err;
    }

    const authHeader = initialResponse.headers.get('www-authenticate') || '';
    if (!authHeader) throw new Error("No digest challenge received from device.");

    const getParam = (str: string, param: string) => {
      const match = str.match(new RegExp(`${param}="?([^",]+)"?`));
      return match ? match[1] : '';
    };

    const realm = getParam(authHeader, 'realm');
    const nonce = getParam(authHeader, 'nonce');
    const qop = getParam(authHeader, 'qop');
    const opaque = getParam(authHeader, 'opaque');
    const nc = '00000001';
    const cnonce = Math.random().toString(36).substring(2, 15);

    const ha1 = await md5(`${username}:${realm}:${password}`);
    const ha2 = await md5(`${method}:${uri}`);

    const responseHash = qop
      ? await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      : await md5(`${ha1}:${nonce}:${ha2}`);

    let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
    if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    if (opaque) authStr += `, opaque="${opaque}"`;

    const secondResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': contentType || 'application/json',
        'Authorization': authStr
      },
      body: bodyContent
    });

    const text = await secondResponse.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { rawXml: text }; }

    if (!secondResponse.ok || (data?.statusCode && data.statusCode !== 1)) {
      const err = new Error(`Device rejected with status ${secondResponse.status}: ${text}`) as any;
      err.subStatusCode = data?.subStatusCode || data?.subCode;
      err.errorMsg = data?.errorMsg;
      throw err;
    }

    return data;
  };

  const isRetryable = (e: any) => {
    return e?.subStatusCode === 'badJsonContent' ||
      e?.subStatusCode === 'faceLibraryIDError' ||
      e?.subStatusCode === 'notSupport' ||
      e?.subStatusCode === 'badXmlFormat' ||
      e?.subStatusCode === 'methodNotAllowed' ||
      e?.errorMsg === 'FPID' ||
      e?.message?.includes('400') ||
      e?.message?.includes('405');
  };

  let lastError: any;

  try {
    return await helperFetch(
      'Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD',
      'PUT',
      {
        FaceInfoDelCond: {
          EmployeeNoList: [{ employeeNo: empNo }]
        }
      }
    );
  } catch (e: any) {
    lastError = e;
    console.warn('[deleteFace] Attempt 1 failed:', e.message?.substring(0, 200));
    if (!isRetryable(e)) throw e;
  }

  try {
    const xmlBody = `<DelFaceParamCfg version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><faceLibType>blackFD</faceLibType><employeeNo>${empNo}</employeeNo></DelFaceParamCfg>`;
    return await helperFetch(
      'AccessControl/DelFaceParamCfg',
      'PUT',
      xmlBody,
      'application/xml'
    );
  } catch (e: any) {
    lastError = e;
    console.warn('[deleteFace] Attempt 2 failed:', e.message?.substring(0, 200));
    if (!isRetryable(e)) throw e;
  }

  try {
    return await helperFetch(
      'Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD',
      'PUT',
      {
        FaceInfoDelCond: {
          FPID: empNo
        }
      }
    );
  } catch (e: any) {
    lastError = e;
    console.warn('[deleteFace] Attempt 3 failed:', e.message?.substring(0, 200));
    if (!isRetryable(e)) throw e;
  }

  try {
    const xmlBody = `<FaceInfoDelCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><EmployeeNoList><EmployeeNoDetail><employeeNo>${empNo}</employeeNo></EmployeeNoDetail></EmployeeNoList></FaceInfoDelCond>`;
    return await helperFetch(
      'Intelligent/FDLib/FDSearch/Delete?FDID=1&faceLibType=blackFD',
      'PUT',
      xmlBody,
      'application/xml'
    );
  } catch (e: any) {
    lastError = e;
    console.warn('[deleteFace] Attempt 4 failed:', e.message?.substring(0, 200));
    if (!isRetryable(e)) throw e;
  }

  try {
    return await helperFetch(
      'Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD',
      'POST',
      {
        FaceInfoDelCond: {
          EmployeeNoList: [{ employeeNo: empNo }]
        }
      }
    );
  } catch (e: any) {
    lastError = e;
    console.warn('[deleteFace] Attempt 5 failed:', e.message?.substring(0, 200));
  }

  const errorMsg = lastError?.subStatusCode === 'faceLibraryIDError'
    ? "Device face library ID mismatch. Please check device configuration."
    : (lastError?.message || "Failed to remove face from device.");
  const err = new Error(errorMsg) as any;
  err.subStatusCode = lastError?.subStatusCode;
  throw err;
};

