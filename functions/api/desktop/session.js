function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ request }) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ success: false, message: 'Invalid JSON body.' }, 400);
  }

  const user = body.user && typeof body.user === 'object' ? body.user : null;
  if (!user?.id && !body.token) {
    return json({ success: false, message: 'Login session is required.' }, 401);
  }

  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const payload = {
    sub: user?.id || 'static-user',
    name: user?.name || '',
    email: user?.email || '',
    hardwareId: String(body.hardwareId || ''),
    appVersion: String(body.appVersion || ''),
    licenseStatus: String(body.licenseStatus || ''),
    expiresAt
  };

  return json({
    success: true,
    session: {
      token: btoa(JSON.stringify(payload)),
      user,
      expiresAt
    }
  });
}
