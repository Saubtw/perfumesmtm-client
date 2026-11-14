if(location.pathname.replace(/\/$/,'')==='/dashboard-admin') {
  await import('./admin.js');
} else {
  await Promise.all([import('./startup.js'),import('./main.js')]);
}
