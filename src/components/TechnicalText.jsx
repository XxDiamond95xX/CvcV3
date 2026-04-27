function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-black text-white">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export default function TechnicalText({ content }) {
  return (
    <div className="space-y-4 text-slate-300 leading-relaxed">
      {content.split('\n\n').map((paragraph, index) => (
        <p key={index}>{renderInline(paragraph)}</p>
      ))}
    </div>
  );
}
