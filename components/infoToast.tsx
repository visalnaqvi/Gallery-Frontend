import { GridLoader } from "react-spinners";

type props = {
    loading: boolean; message: string
}

export default function InfoToast({ loading, message }: props) {
    return (
        <div className="m-4 p-4 bg-blue-100">
            <div className="inline-flex items-center">
                {loading && <GridLoader
                    className="mr-4"
                    size={10}
                    color="#2b7fff"
                    aria-label="Loading Spinner"
                    data-testid="loader"
                />}
                <p className="text-blue-600 font-semibold">
                    {message}
                </p>
            </div>
        </div>
    )
}