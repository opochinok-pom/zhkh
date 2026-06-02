import React, { useState, useRef } from 'react';
import { parseCommandAI } from '../api.js';

function CommandBar({ onResult, addToast }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  // ── Web Speech API ─────────────────────────────────────────────────────────
  const SpeechRecognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startVoice = () => {
    if (!SpeechRecognition) {
      addToast('Голосовой ввод не поддерживается в этом браузере', 'error');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ru-RU';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend   = () => setListening(false);
    rec.onerror = e => { addToast('Ошибка голоса: ' + e.error, 'error'); setListening(false); };
    rec.onresult = e => {
      const transcript = e.results[0][0].transcript;
      setText(transcript);
      sendCommand(transcript);
    };

    rec.start();
    recognitionRef.current = rec;
  };

  const sendCommand = async (cmd = text) => {
    if (!cmd.trim()) return;
    setLoading(true);
    try {
      const data = await parseCommandAI(cmd);
      if (data.month && data.service && data.property) {
        addToast(`📋 Понял: ${data.month} / ${data.service} / ${data.property} = ${data.amount} ₽`, 'info');
        await onResult(data);
        setText('');
      } else {
        addToast('Не удалось распознать команду', 'error');
      }
    } catch (e) {
      addToast('Ошибка AI: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const onKey = e => { if (e.key === 'Enter') sendCommand(); };

  return (
    <div className="command-bar">
      <input
        className="command-input"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder='💬 Введите команду: "Л25/28 электроэнергия июнь 3500" или нажмите 🎤'
        disabled={loading}
      />
      <button
        className={`mic-btn ${listening ? 'listening' : ''}`}
        onClick={startVoice}
        title={listening ? 'Остановить' : 'Голосовой ввод'}
      >
        {listening ? '⏹' : '🎤'}
      </button>
      <button
        className="btn btn-outline"
        onClick={() => sendCommand()}
        disabled={!text.trim() || loading}
        style={{ flexShrink: 0 }}
      >
        {loading ? '…' : '▶ Выполнить'}
      </button>
    </div>
  );
}

export default CommandBar;
