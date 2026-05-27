const btn    = document.getElementById('fillBtn');
const status = document.getElementById('status');

btn.addEventListener('click', async () => {
  btn.disabled = true;
  btn.textContent = 'Filling…';
  status.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) throw new Error('No active tab found.');

    // chrome:// and other privileged pages can't be scripted
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot run on this page. Navigate to a job application first.');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'autoFill' });

    const n = response?.filled ?? 0;
    status.className = 'status success';
    status.textContent = `✓ Filled ${n} field${n !== 1 ? 's' : ''}. Yellow fields need manual input.`;
  } catch (err) {
    status.className = 'status error';
    const msg = err.message || '';
    if (msg.includes('Could not establish connection') || msg.includes('Receiving end does not exist')) {
      status.textContent = '✗ Reload the page then try again.';
    } else {
      status.textContent = `✗ ${msg || 'Unknown error.'}`;
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Fill This Form';
    status.style.display = 'block';
  }
});
