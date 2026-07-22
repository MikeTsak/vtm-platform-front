const fs = require('fs');

let content = fs.readFileSync('src/features/chat/ChatSystem.jsx', 'utf8');

// Replace ChatImage component definition with ChatMedia
const oldComponent = content.match(/const ChatImage = \(\{ attachmentId \}\) => \{[\s\S]*?return \(\s*<img[\s\S]*?\/>\s*\);\s*\};/);

if (!oldComponent) {
  console.log("ChatImage component not found!");
  process.exit(1);
}

const newComponent = `const ChatMedia = ({ attachmentId }) => {
  const [prevId, setPrevId] = useState(attachmentId);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (attachmentId !== prevId) {
    setPrevId(attachmentId);
    setMediaInfo(null);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    let active = true;
    let urlToRevoke = null;

    api.get(\`/chat/media/\${attachmentId}/info\`)
      .then(async (response) => {
        if (!active) return;
        const info = response.data;
        if (info.url) {
          setMediaInfo({ url: info.url, mime: info.mime });
          setLoading(false);
        } else {
          // Fallback to fetch blob
          try {
            const blobRes = await api.get(\`/chat/media/\${attachmentId}\`, { responseType: 'blob' });
            if (!active) return;
            urlToRevoke = URL.createObjectURL(blobRes.data);
            setMediaInfo({ url: urlToRevoke, mime: info.mime || blobRes.data.type });
            setLoading(false);
          } catch (e) {
             if (!active) return;
             setError(true);
             setLoading(false);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load media info", err);
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [attachmentId]);

  if (loading) return (
    <Skeleton name="chat-media-loader" loading={true}>
      <div className="w-48 h-48 max-w-full rounded bg-surface-variant/30 animate-pulse" />
    </Skeleton>
  );
  if (error) return <div className="p-4 bg-error/20 text-error rounded-lg text-sm text-center border border-dashed border-error">Media failed to load</div>;

  if (mediaInfo?.mime?.startsWith('video/')) {
    return (
      <video
        controls
        src={mediaInfo.url}
        className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded block"
      />
    );
  }
  if (mediaInfo?.mime?.startsWith('audio/')) {
    return (
      <audio
        controls
        src={mediaInfo.url}
        className="w-full max-w-[300px] rounded block"
      />
    );
  }

  return (
    <img
      src={mediaInfo?.url}
      alt="Attachment"
      className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded cursor-pointer block"
      onClick={() => window.open(mediaInfo?.url, '_blank')}
    />
  );
};`;

content = content.replace(oldComponent[0], newComponent);

// Replace usages of ChatImage with ChatMedia
content = content.replace(/<ChatImage /g, '<ChatMedia ');

fs.writeFileSync('src/features/chat/ChatSystem.jsx', content);
console.log("Successfully updated ChatSystem.jsx");
