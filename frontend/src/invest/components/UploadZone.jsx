import React, { useRef, useState } from 'react';

function UploadZone({ shots, onAdd, onRemove, disabled }) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const addFiles = fileList => {
    const imgs = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (imgs.length) onAdd(imgs);
  };

  const onDrop = e => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        className={`i-upload-zone ${drag ? 'i-drag-over' : ''} ${disabled ? 'i-disabled' : ''}`}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => !disabled && fileRef.current?.click()}
      >
        <div className="i-upload-icon">📊</div>
        <p>Перетащите скриншоты портфеля</p>
        <p className="i-upload-hint">можно несколько сразу — приложение, терминал, таблица</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {shots.length > 0 && (
        <div className="i-thumbs">
          {shots.map(s => (
            <div className="i-thumb" key={s.id}>
              <img src={s.preview} alt="Скриншот портфеля" />
              {!disabled && (
                <button className="i-thumb-remove" onClick={() => onRemove(s.id)}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UploadZone;
