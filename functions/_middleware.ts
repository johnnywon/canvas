// Redirect canvas.trypulson.com to pulson-canvas.pages.dev.
// canvas.trypulson.com is a cross-account custom domain (zone: roguerobots,
// Pages: pulsead) so CF Access can't work there. This middleware redirects at
// the Pages layer — before CF Access fires — so users always land on the
// domain where auth works correctly.
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  if (url.hostname === 'canvas.trypulson.com') {
    url.hostname = 'pulson-canvas.pages.dev'
    return Response.redirect(url.toString(), 301)
  }
  return context.next()
}
