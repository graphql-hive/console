import { mapGraphiQLOptionsToLaboratoryProps } from '../src/props';

describe('mapGraphiQLOptionsToLaboratoryProps', () => {
  it('forwards the GraphiQL endpoint as the default endpoint', () => {
    const props = mapGraphiQLOptionsToLaboratoryProps({
      endpoint: 'https://api.example.com/graphql',
    });

    expect(props.defaultEndpoint).toBe('https://api.example.com/graphql');
  });

  // The page serializes these props with JSON.stringify, so an unset endpoint has to vanish and
  // leave the Lab's own fallback (saved endpoint, then page URL) in charge.
  it('leaves the default endpoint out when none is configured', () => {
    const serialized = JSON.parse(
      JSON.stringify(mapGraphiQLOptionsToLaboratoryProps({ title: 'Lab' })),
    );

    expect(serialized).not.toHaveProperty('defaultEndpoint');
  });
});
