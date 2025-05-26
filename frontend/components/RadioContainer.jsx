export default function RadioContainer({
  children,
  bulletNb,
  title,
  hasSelector,
}) {
  return (
    <div
      className={`py-5 bg-secondary border-1 border-main mb-8 max-w-xl relative before:absolute before:pointer-events-none before:inset-0 before:bg-main-5 ${hasSelector ? 'px-5' : 'px-2'} ${bulletNb === 1 ? 'z-10' : 'z-0'}`}
    >
      <h3 className="px-3 mb-6">
        {bulletNb}. {title}
      </h3>
      {children}
    </div>
  );
}
