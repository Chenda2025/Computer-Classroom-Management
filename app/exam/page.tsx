import { Suspense } from 'react';
import ExamClient from './ExamClient';

export default function ExamPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{
        __html: `
          window.onerror = function(msg, url, lineNo, columnNo, error) {
            var err = document.createElement('div');
            err.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;z-index:9999;padding:20px;font-size:12px;word-break:break-all;';
            err.innerHTML = 'ERROR: ' + msg + '<br>' + url + ':' + lineNo;
            document.body.appendChild(err);
            return false;
          };
          window.addEventListener('unhandledrejection', function(event) {
            var err = document.createElement('div');
            err.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:darkred;color:white;z-index:9999;padding:20px;font-size:12px;word-break:break-all;';
            err.innerHTML = 'PROMISE REJECTION: ' + (event.reason ? (event.reason.message || event.reason) : 'Unknown');
            document.body.appendChild(err);
          });
        `
      }} />
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>កំពុងផ្ទុក...</div>}>
        <ExamClient />
      </Suspense>
    </>
  );
}
