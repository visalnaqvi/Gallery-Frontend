'use client'
import { GridLoader } from "react-spinners";
import { CheckCircle } from "lucide-react";
type props = {
    loading: boolean; message: string; success?: boolean
}

export default function InfoToast({ loading, message, success = false }: props) {
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
                {success && <CheckCircle
                    className="mr-4"
                    size={30}
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