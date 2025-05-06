import { Card } from '@/components/ui/card'
import React from 'react'

function Dashboard() {
    // Your 
    return (
        <React.Fragment>
            <h1 className='text-md font-bold mt-6 text-gray-600'>
                Welcome back,<br />
                <span className='text-gray-800 text-xl'>John Doe</span>!
            </h1>
            <div className="mt-4 flex gap-5 ">

                {
                    Array(4).fill(0).map((_, index) => (
                        <Card className='w-1/5 rounded-sm py-3' key={
                            index
                        }>
                            <div className="flex flex-col gap-2 py-2 px-3">
                                <h1 className='text-md font-bold text-gray-600'>Total Repositories</h1>
                                <p className='text-xl font-bold text-gray-800'>12</p>
                            </div>
                        </Card>
                    ))
                }

            </div>
        </React.Fragment>
    )
}

export default Dashboard