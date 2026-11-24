import { useState } from 'react';

// Key the image by its URL so replacing a failed photo retries the new source.
function AvatarImage({ src, fallback, style }) {
  const [failed, setFailed] = useState(false);
  return failed ? fallback : <img src={src} alt="" style={style} onError={() => setFailed(true)} />;
}

export default function MemberAvatar({ src, fallback, style }) {
  return src ? <AvatarImage key={src} src={src} fallback={fallback} style={style} /> : fallback;
}
