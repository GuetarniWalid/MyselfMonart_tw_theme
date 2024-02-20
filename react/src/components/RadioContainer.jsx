export default function RadioContainer({ children }) {
  return (
    <div className='p-5 bg-main/5 border-main border-1'>
      <h3 className="mb-6">1. Choisissez votre taille</h3>
      {children}
    </div>
  );
}
