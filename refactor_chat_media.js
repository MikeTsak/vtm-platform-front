const fs = require('fs');

const path = 'src/features/chat/ChatSystem.jsx';
let code = fs.readFileSync(path, 'utf8');

const targetFunction = `  const renderAttachment = (m) => {
    if (m.attachment_id) {
      const url = \`/api/chat/media/\${m.attachment_id}?token=\${localStorage.getItem('token')}\`;
      return <AttachmentImage fileId={m.attachment_id} imageUrl={url} />;
    }
    return null;
  };`;

const newFunction = `  const renderAttachment = (m) => {
    if (m.attachment_id) {
      const url = \`/api/chat/media/\${m.attachment_id}?token=\${localStorage.getItem('token')}\`;
      return <AttachmentMedia fileId={m.attachment_id} mediaUrl={url} />;
    }
    return null;
  };`;

code = code.replace(targetFunction, newFunction);

const attachmentImageDefinition = `function AttachmentImage({ fileId, imageUrl }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="mt-2 relative">
      {loading && !error && <div className="absolute inset-0 flex items-center justify-center bg-surface-dim rounded text-[10px] text-on-surface-variant font-bold tracking-widest animate-pulse">LOADING MEDIA</div>}
      {error ? (
        <div className="p-4 bg-error/20 text-error rounded-lg text-sm text-center border border-dashed border-error">s Image failed to load</div>
      ) : (
        <img
          src={imageUrl}
          alt="Attachment"
          className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded cursor-pointer block"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onClick={() => window.open(imageUrl, '_blank')}
          style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s ease' }}
        />
      )}
    </div>
  );
}`;

const attachmentMediaDefinition = `function AttachmentMedia({ fileId, mediaUrl }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mime, setMime] = useState(null);

  useEffect(() => {
    // Determine mime type by making a quick HEAD request
    fetch(mediaUrl, { method: 'HEAD' })
      .then(res => {
        const contentType = res.headers.get('content-type');
        setMime(contentType || 'image/jpeg');
      })
      .catch(() => setMime('image/jpeg'))
      .finally(() => setLoading(false));
  }, [mediaUrl]);

  if (loading) {
    return (
      <div className="mt-2 relative w-full h-[150px] bg-surface-dim rounded flex items-center justify-center">
        <div className="text-[10px] text-on-surface-variant font-bold tracking-widest animate-pulse">LOADING MEDIA</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 p-4 bg-error/20 text-error rounded-lg text-sm text-center border border-dashed border-error">s Media failed to load</div>
    );
  }

  const isVideo = mime && mime.startsWith('video/');
  const isAudio = mime && mime.startsWith('audio/');

  return (
    <div className="mt-2 relative">
      {isVideo ? (
        <video 
          src={mediaUrl} 
          controls 
          className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded block"
          onError={() => setError(true)}
        />
      ) : isAudio ? (
        <audio 
          src={mediaUrl} 
          controls 
          className="w-full max-w-md rounded"
          onError={() => setError(true)}
        />
      ) : (
        <img
          src={mediaUrl}
          alt="Attachment"
          className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded cursor-pointer block"
          onError={() => setError(true)}
          onClick={() => window.open(mediaUrl, '_blank')}
        />
      )}
    </div>
  );
}`;

code = code.replace(attachmentImageDefinition, attachmentMediaDefinition);

fs.writeFileSync(path, code);
console.log('ChatSystem.jsx updated for dynamic media rendering!');
