if(location.pathname.replace(/\/$/,'')==='/dashboard-admin') {
  await import('./admin.js');
} else {
  await import('./shop.js');
}
