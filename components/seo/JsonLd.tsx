// JSON-LD Script Component for structured data
interface JsonLdProps {
  data: object | object[];
}

export default function JsonLd({ data }: JsonLdProps) {
  const jsonLdString = JSON.stringify(
    Array.isArray(data) ? data : data,
    null,
    0
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString }}
    />
  );
}
