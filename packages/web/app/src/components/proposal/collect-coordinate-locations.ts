import {
  getLocation,
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLUnionType,
  isIntrospectionType,
  Location,
  Source,
} from 'graphql';

export function collectCoordinateLocations(
  schema: GraphQLSchema,
  source: Source,
): Map<string, number> {
  const coordinateToLine = new Map<string, number>();

  const collectObjectType = (
    type: GraphQLObjectType<any, any> | GraphQLInputObjectType | GraphQLInterfaceType,
  ) => {
    collect(type.name, type.astNode?.loc);
    const fields = type.getFields();
    if (fields) {
      for (const field of Object.values(fields)) {
        collectField(type, field);
      }
    }
  };

  const collect = (coordinate: string, location: Location | undefined) => {
    const sourceLoc = location && getLocation(source, location.start);
    if (sourceLoc?.line) {
      coordinateToLine.set(coordinate, sourceLoc.line);
    } else {
      console.warn(`Location not found for "${coordinate}"`);
    }
  };

  const collectEnumType = (type: GraphQLEnumType) => {
    collect(type.name, type.astNode?.loc);
    for (const val of type.getValues()) {
      const coord = `${type.name}.${val.name}`;
      collect(coord, val.astNode?.loc);
    }
  };

  const collectUnionType = (type: GraphQLUnionType) => {
    collect(type.name, type.astNode?.loc);
    // for (const unionType of type.getTypes()) {
    //   const coordinate = `${type.name}.${unionType.name}`;
    //   collect(coordinate, type.astNode?.loc);
    // }
  };

  const collectNamedType = (type: GraphQLNamedType) => {
    if (isIntrospectionType(type)) {
      return;
    }

    if (
      type instanceof GraphQLObjectType ||
      type instanceof GraphQLInputObjectType ||
      type instanceof GraphQLInterfaceType
    ) {
      collectObjectType(type);
    } else if (type instanceof GraphQLUnionType) {
      collectUnionType(type);
    } else if (type instanceof GraphQLEnumType) {
      collectEnumType(type);
    } else {
      collect(type.name, type.astNode?.loc);
    }
  };

  const collectArg = (
    type: GraphQLObjectType<any, any> | GraphQLInputObjectType | GraphQLInterfaceType,
    field: GraphQLField<any, any>,
    arg: GraphQLArgument,
  ) => {
    const coord = `${type.name}.${field.name}.${arg.name}`;
    collect(coord, arg.astNode?.loc);
  };

  const collectField = (
    type: GraphQLObjectType<any, any> | GraphQLInputObjectType | GraphQLInterfaceType,
    field: GraphQLField<any, any>,
  ) => {
    const coord = `${type.name}.${field.name}`;
    collect(coord, field.astNode?.loc);

    for (const arg of field.args) {
      collectArg(type, field, arg);
    }
  };

  for (const named of Object.values(schema.getTypeMap())) {
    collectNamedType(named);
  }

  return coordinateToLine;
}
