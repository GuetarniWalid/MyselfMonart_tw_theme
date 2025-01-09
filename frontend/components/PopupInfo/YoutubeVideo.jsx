export default function YoutubeVideo({ technicalKey, data }) {
  return (
    <iframe
      width="560"
      height="315"
      src={`https://www.youtube.com/embed/${data[technicalKey].popup.youtubeVideoId}?rel=0&modestbranding=1&showinfo=0&controls=0&iv_load_policy=3`}
      style={{ border: 0, aspectRatio: '16/9' }}
      allow="autoplay; encrypted-media"
      allowFullScreen
      className="!block mx-auto w-full h-auto cursor-pointer"
    ></iframe>
  );
}
