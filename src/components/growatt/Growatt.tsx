import useGrowatt from "./useGrowatt";

const Growatt = () => {
  const { userInfoQuery, deviceListQuery, chargeTimeMutation } = useGrowatt();

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Growatt</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => userInfoQuery.refetch()}
          disabled={userInfoQuery.isFetching}
          className="bg-blue-300 p-2 rounded-lg disabled:opacity-50"
        >
          {userInfoQuery.isFetching ? "Loading..." : "Get User Info"}
        </button>
        <button
          onClick={() => deviceListQuery.refetch()}
          disabled={deviceListQuery.isFetching}
          className="bg-blue-300 p-2 rounded-lg disabled:opacity-50"
        >
          {deviceListQuery.isFetching ? "Loading..." : "Get Device List"}
        </button>
        <button
          onClick={() => chargeTimeMutation.mutate({ startHour: "01", startMin: "00", endHour: "03", endMin: "00" })}
          disabled={chargeTimeMutation.isPending}
          className="bg-green-300 p-2 rounded-lg disabled:opacity-50"
        >
          {chargeTimeMutation.isPending ? "Setting..." : "Set Charge 01:00–03:00"}
        </button>
      </div>

      {userInfoQuery.isError && (
        <p className="text-red-500 mb-2">User info error: {(userInfoQuery.error as Error).message}</p>
      )}
      {deviceListQuery.isError && (
        <p className="text-red-500 mb-2">Device list error: {(deviceListQuery.error as Error).message}</p>
      )}
      {chargeTimeMutation.isError && (
        <p className="text-red-500 mb-2">Set charge error: {(chargeTimeMutation.error as Error).message}</p>
      )}
      {chargeTimeMutation.isSuccess && (
        <p className="text-green-600 mb-2">Charge time set successfully</p>
      )}

      {userInfoQuery.data && (
        <pre className="text-sm bg-gray-100 p-2 rounded mb-2">
          {JSON.stringify(userInfoQuery.data, null, 2)}
        </pre>
      )}
      {deviceListQuery.data && (
        <pre className="text-sm bg-gray-100 p-2 rounded">
          {JSON.stringify(deviceListQuery.data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default Growatt;
