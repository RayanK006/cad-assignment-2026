import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { actorKey, ddb, movieKey, type Role, tableName } from "../shared/db";
import { isResponse, parseJsonObject, response } from "../shared/http";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const body = parseJsonObject(event);
  if (isResponse(body)) return body;

  const role: Role = {
    movieId: body.movieId as number,
    actorId: body.actorId as number,
    roleName: body.roleName as string,
    roleDescription: body.roleDescription as string,
  };
  if (
  !Number.isSafeInteger(role.movieId) ||
  role.movieId <= 0 ||
  !Number.isSafeInteger(role.actorId) ||
  role.actorId <= 0
) {
  return response(400, {
    message: "movieId and actorId must be positive integers",
  });
}

//if role name is not a string 0R tr role description is not a string return invalid
if (
  typeof role.roleName !== "string" ||
  role.roleName.trim() === "" ||
  typeof role.roleDescription !== "string" ||
  role.roleDescription.trim() === ""
) {
  return response(400, {
    message: "roleName and roleDescription must not be empty",
  });
}
    //  TOD∏O - Add role if its IDs are valid
    try {
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
  {
    ConditionCheck: {
      TableName: tableName,
      Key: {
        PK: movieKey(role.movieId),
        SK: movieKey(role.movieId),
      },
      ConditionExpression: "attribute_exists(PK)",
    },
  }, {
    ConditionCheck: {
      TableName: tableName,
      Key: { PK: actorKey(role.actorId), SK: actorKey(role.actorId),
      },
      ConditionExpression: "attribute_exists(PK)",
    },
  },{
    Put: {
      TableName: tableName,
      Item: {
        PK: movieKey(role.movieId),
        SK: actorKey(role.actorId),
        ...role,},
      ConditionExpression: "attribute_not_exists(PK)",
    },
  },
      ],
    })
  );


  return response(201, {message: "Role added", data: role,});

} catch (err) {
  console.error("DynamoDB error:", err);

  if (err instanceof Error && err.name === "TransactionCanceledException") 
    {
    return response(409, { message: "Role already exists, or the movie or actor does not exist",});
  }

  return response(500, { message: "Internal server error",});
}

};
