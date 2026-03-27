import { getAllSchemas } from '@/lib/schema';

export default function JsonLdSchema() {
  const schemas = getAllSchemas();

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
