import useGrowatt from "./useGrowatt";

const Growatt = () => {
  const { isLoggedIn, loginMutation, plantListQuery, deviceListQuery, chargeTimeMutation } = useGrowatt();

  const errors = [
    loginMutation.isError && `Login error: ${(loginMutation.error as Error).message}`,
    plantListQuery.isError && `Plant list error: ${(plantListQuery.error as Error).message}`,
    deviceListQuery.isError && `Device list error: ${(deviceListQuery.error as Error).message}`,
    chargeTimeMutation.isError && `Set charge error: ${(chargeTimeMutation.error as Error).message}`,
  ].filter(Boolean);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Growatt</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => loginMutation.mutate()}
          disabled={loginMutation.isPending || isLoggedIn}
          className="bg-blue-300 p-2 rounded-lg disabled:opacity-50"
        >
          {loginMutation.isPending ? "Logging in..." : isLoggedIn ? "Logged in ✓" : "Login"}
        </button>
        <button
          onClick={() => plantListQuery.refetch()}
          disabled={!isLoggedIn || plantListQuery.isFetching}
          className="bg-blue-300 p-2 rounded-lg disabled:opacity-50"
        >
          {plantListQuery.isFetching ? "Loading..." : "Get Plants"}
        </button>
        <button
          onClick={() => chargeTimeMutation.mutate({ p2: { startHour: "01", startMin: "00", endHour: "03", endMin: "00" }, p3: null })}
          disabled={!isLoggedIn || chargeTimeMutation.isPending}
          className="bg-green-300 p-2 rounded-lg disabled:opacity-50"
        >
          {chargeTimeMutation.isPending ? "Setting..." : "Set Charge 01:00–03:00"}
        </button>
      </div>

      {errors.map((e, i) => (
        <p key={i} className="text-red-500 mb-2">{e as string}</p>
      ))}
      {chargeTimeMutation.isSuccess && (
        <p className="text-green-600 mb-2">Charge time set successfully</p>
      )}
      {deviceListQuery.isFetching && (
        <p className="text-gray-500 mb-2">Loading devices...</p>
      )}

      {plantListQuery.data && (
        <pre className="text-sm bg-gray-100 p-2 rounded mb-2">
          {JSON.stringify(plantListQuery.data, null, 2)}
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
