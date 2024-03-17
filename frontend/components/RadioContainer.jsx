export default function RadioContainer({
  children,
  bulletNb,
  title,
  hasSelector,
  labelGroupId,
}) {
  return (
    <div
      className={`py-5 bg-main/5 border-main border-1 mb-8 max-w-xl ${
        hasSelector ? 'px-5' : 'px-2'
      }`}
    >
      <h3 className="px-3 mb-6" id={labelGroupId}>
        {bulletNb}. {title}
      </h3>
      {children}
    </div>
  );
}
