
// The following gets the id for PATCH, PUT or DELETE APIs
export async function getIdFromParams(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return id;
}
